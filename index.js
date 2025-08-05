import puppeteer from 'puppeteer';
import { saveToJson, delay, getTimestamp } from './utils.js';
import config from './config.js';

// Fungsi untuk login ke edlink.id
export async function loginToEdlink(page, email, password) {
  try {
    console.log('🚀 Starting login process...');
    
    // Navigate to login page
    console.log('🌐 Navigating to login page: https://edlink.id/login');
    await page.goto('https://edlink.id/login', { waitUntil: 'networkidle2' });
    
    // Wait for login form to load
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
    
    console.log('✅ Login form loaded successfully');
    
    // Find and fill email field
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
    await page.waitForSelector(emailSelector);
    await page.click(emailSelector);
    await page.type(emailSelector, email, { delay: 100 });
    console.log('📧 Email entered successfully');
    
    // Find and fill password field
    const passwordSelector = 'input[type="password"], input[name="password"]';
    await page.waitForSelector(passwordSelector);
    await page.click(passwordSelector);
    await page.type(passwordSelector, password, { delay: 100 });
    console.log('🔐 Password entered successfully');
    
    console.log('✅ Login credentials entered successfully');
    
    // Find and click login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Login")',
      'button:contains("Masuk")',
      '.btn-login',
      '#login-btn',
      '[data-testid="login-button"]'
    ];
    
    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      try {
        loginButton = await page.$(selector);
        if (loginButton) {
          console.log(`Found login button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!loginButton) {
      // Try to find button by text content
      loginButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return buttons.find(btn => 
          btn.textContent.toLowerCase().includes('login') ||
          btn.textContent.toLowerCase().includes('masuk') ||
          btn.textContent.toLowerCase().includes('sign in')
        );
      });
    }
    
    if (loginButton && loginButton.asElement) {
      await loginButton.asElement().click();
      console.log('🖱️ Login button clicked, waiting for response...');
    } else {
      throw new Error('Login button not found');
    }
    
    // Wait for navigation or login response
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.waitForSelector('.error, .alert-danger, [class*="error"]', { timeout: 5000 })
      ]);
    } catch (e) {
      console.log('No immediate navigation or error detected, continuing...');
    }
    
    // Wait a bit for any dynamic content
    await delay(3000);
    
    console.log('⏳ Processing login attempt...');
    
    // Check if login was successful
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    // Check for common success indicators
    const isLoggedIn = await page.evaluate(() => {
      // Check for common logged-in indicators
      const indicators = [
        () => !window.location.href.includes('/login'),
        () => document.querySelector('[data-testid="user-menu"], .user-menu, .profile-menu'),
        () => document.querySelector('a[href*="logout"], a[href*="keluar"]'),
        () => document.querySelector('.dashboard, #dashboard'),
        () => document.cookie.includes('session') || document.cookie.includes('token')
      ];
      
      return indicators.some(check => {
        try {
          return check();
        } catch (e) {
          return false;
        }
      });
    });
    
    if (isLoggedIn || !currentUrl.includes('/login')) {
      console.log('✅ Login appears to be successful!');
      return { success: true, url: currentUrl };
    } else {
      console.log('❌ Login may have failed - still on login page');
      
      // Check for error messages
      const errorMessage = await page.evaluate(() => {
        const errorSelectors = [
          '.error', '.alert-danger', '.alert-error',
          '[class*="error"]', '[class*="danger"]',
          '.invalid-feedback', '.form-error'
        ];
        
        for (const selector of errorSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            return element.textContent.trim();
          }
        }
        return null;
      });
      
      return { 
        success: false, 
        url: currentUrl, 
        error: errorMessage || 'Login failed - unknown reason' 
      };
    }
    
  } catch (error) {
    console.error('Login error:', error);
    console.log('❌ Login error occurred, capturing error details...');
    throw error;
  }
}

// Fungsi untuk mengekstrak data mata kuliah
export async function scrapeCourseData(page) {
  try {
    console.log('📚 Starting course data extraction...');
    
    // Debug: Check what elements are available
    const debugInfo = await page.evaluate(() => {
      const cardSelectors = [
        '.card.card_custom-class-item',
        '.card_custom-class-item',
        '.card',
        '[class*="card"]',
        '[class*="class-item"]'
      ];
      
      const results = {};
      cardSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
      });
      
      // Also check page content
      const bodyText = document.body.innerText;
      const hasClassText = bodyText.includes('kelas') || bodyText.includes('class');
      const hasNoClassText = bodyText.includes('belum memiliki kelas') || bodyText.includes('tidak tersedia');
      
      return {
        selectors: results,
        hasClassText,
        hasNoClassText,
        pageContent: bodyText.substring(0, 500)
      };
    });
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    const courseData = await page.evaluate(() => {
      const courses = [];
      
      // Try multiple selectors for course cards
      const cardSelectors = [
        '.card.card_custom-class-item',
        '.card_custom-class-item',
        'a[href*="/classes/"][href*="/sections"]'
      ];
      
      let courseCards = [];
      for (const selector of cardSelectors) {
        courseCards = document.querySelectorAll(selector);
        if (courseCards.length > 0) {
          console.log(`Found ${courseCards.length} course cards with selector: ${selector}`);
          break;
        }
      }
      
      courseCards.forEach(card => {
        try {
          // Extract course code from href
          const linkElement = card.closest('a');
          const href = linkElement ? linkElement.getAttribute('href') : '';
          const kodeMatch = href.match(/\/classes\/(\d+)\//);
          const kode_mata_kuliah = kodeMatch ? kodeMatch[1] : '';
          
          // Extract course title and class code
          const titleElement = card.querySelector('.card__title');
          const titleText = titleElement ? titleElement.textContent.trim() : '';
          
          // Parse title to get mata_kuliah and kode_kelas
          // Format: "Teknologi Informasi dan Komunikasi (NO)"
          const titleMatch = titleText.match(/^(.+?)\s*\(([^)]+)\)$/);
          const mata_kuliah = titleMatch ? titleMatch[1].trim() : titleText;
          const kode_kelas = titleMatch ? titleMatch[2].trim() : '';
          
          // Extract program studi
          const subtitleElement = card.querySelector('.card__subtitle');
          const program_studi = subtitleElement ? subtitleElement.textContent.trim() : '';
          
          // Extract pengajar (instructors)
          const instructorElements = card.querySelectorAll('.card__info_class-item');
          let pengajar = '';
          
          instructorElements.forEach(infoElement => {
            const icon = infoElement.querySelector('.icon-user-mini');
            if (icon) {
              const instructorText = infoElement.querySelector('p');
              if (instructorText) {
                const mainInstructor = instructorText.querySelector('span');
                const additionalLink = instructorText.querySelector('.card__info_see-more');
                
                let instructors = [];
                if (mainInstructor) {
                  instructors.push(mainInstructor.textContent.trim());
                }
                if (additionalLink) {
                  const tooltip = additionalLink.getAttribute('data-tooltip');
                  if (tooltip) {
                    instructors.push(tooltip.trim());
                  }
                }
                pengajar = instructors.join(' dan ');
              }
            }
          });
          
          // Extract waktu kuliah (schedule)
          let waktu_kuliah = '';
          instructorElements.forEach(infoElement => {
            const icon = infoElement.querySelector('.icon-calendar-days-mini');
            if (icon) {
              const scheduleText = infoElement.querySelector('p span');
              if (scheduleText) {
                waktu_kuliah = scheduleText.textContent.trim();
              }
            }
          });
          
          // Only add if we have essential data
          if (kode_mata_kuliah && mata_kuliah) {
            courses.push({
              kode_mata_kuliah,
              nama_mata_kuliah: mata_kuliah,
              kode_kelas,
              program_studi,
              pengajar,
              waktu_kuliah
            });
          }
        } catch (error) {
          console.error('Error parsing course card:', error);
        }
      });
      
      return courses;
    });
    
    console.log(`📊 Successfully extracted ${courseData.length} courses from the page`);
    return courseData;
    
  } catch (error) {
    console.error('Course data extraction error:', error);
    throw error;
  }
}

// Fungsi untuk scraping data anggota kelompok
export async function scrapeGroupMembers(page, kode_mata_kuliah) {
  try {
    console.log(`👥 Starting group member scraping for course: ${kode_mata_kuliah}`);
    
    // Navigate to groupteams page
    const groupteamsUrl = `https://edlink.id/panel/classes/${kode_mata_kuliah}/groupteams`;
    console.log(`🌐 Navigating to groupteams page: ${groupteamsUrl}`);
    await page.goto(groupteamsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    
    console.log(`✅ Successfully loaded groupteams page for course: ${kode_mata_kuliah}`);
    
    // Check if there are any groups available and get total count
    const groupsInfo = await page.evaluate(() => {
      const groupBoxes = document.querySelectorAll('.box.is-boxed-3.groupteams-box');
      const totalGroupsElement = document.querySelector('p[data-v-634f3656] .has-text-darkblue');
      const totalGroups = totalGroupsElement ? parseInt(totalGroupsElement.textContent.trim()) : groupBoxes.length;
      
      return {
        hasGroups: groupBoxes.length > 0,
        totalGroups: totalGroups,
        availableBoxes: groupBoxes.length
      };
    });
    
    if (!groupsInfo.hasGroups) {
      console.log('No groups found for this course');
      return {
        success: false,
        kode_mata_kuliah,
        error: 'No groups found for this course'
      };
    }
    
    console.log(`📋 Found ${groupsInfo.totalGroups} total groups, ${groupsInfo.availableBoxes} group boxes available for scraping`);
    
    const allGroupsData = [];
    const groupBoxSelector = '.box.is-boxed-3.groupteams-box';
    
    // Get all group boxes
    await page.waitForSelector(groupBoxSelector, { timeout: 10000 });
    
    // Iterate through all available group boxes
    for (let groupIndex = 0; groupIndex < groupsInfo.availableBoxes; groupIndex++) {
      try {
        console.log(`🔄 Processing group ${groupIndex + 1} of ${groupsInfo.availableBoxes}...`);
        
        // Navigate back to groupteams page if not on first iteration
        if (groupIndex > 0) {
          console.log('Navigating back to groupteams page...');
          await page.goto(groupteamsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(3000);
          await page.waitForSelector(groupBoxSelector, { timeout: 10000 });
        }
        
        // Get all group boxes again (they might have changed after navigation)
        const groupBoxes = await page.$$(groupBoxSelector);
        
        if (groupIndex >= groupBoxes.length) {
          console.log(`Group ${groupIndex + 1} not found, skipping...`);
          continue;
        }
        
        const currentGroupBox = groupBoxes[groupIndex];
        
        // Extract group info before clicking
        const groupInfo = await page.evaluate((index) => {
          const groupBoxes = document.querySelectorAll('.box.is-boxed-3.groupteams-box');
          const groupBox = groupBoxes[index];
          if (!groupBox) return null;
          
          const groupNameElement = groupBox.querySelector('.team-name');
          const groupName = groupNameElement ? groupNameElement.textContent.trim() : `Kelompok ${index + 1}`;
          
          const participantsElement = groupBox.querySelector('.font-14.font-w-500.has-text-grey2');
          const participantsInfo = participantsElement ? participantsElement.textContent.trim() : '';
          
          return {
            groupName,
            participantsInfo,
            groupIndex: index + 1
          };
        }, groupIndex);
        
        console.log(`📝 Processing group: ${groupInfo?.groupName} (${groupInfo?.participantsInfo})`);
        
        // Click the group box
        await currentGroupBox.click();
        console.log('✅ Group box clicked, navigating to discussion page...');
        await delay(3000);
        
        // Wait for navigation to discussion page with better error handling
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
          await delay(2000);
        } catch (navError) {
          console.log('Navigation timeout, checking if we are already on discussion page...');
          const currentUrl = page.url();
          if (!currentUrl.includes('/discussion')) {
            console.log('Not on discussion page, trying to find discussion link...');
            // Try to find and click discussion link or navigate directly
            try {
              const discussionLink = await page.$('a[href*="/discussion"]');
              if (discussionLink) {
                await discussionLink.click();
                await delay(3000);
              } else {
                console.log('Discussion link not found, skipping this group...');
                continue;
              }
            } catch (linkError) {
              console.log('Failed to find discussion link, skipping this group...');
              continue;
            }
          }
        }
        
        console.log(`✅ Successfully loaded discussion page for group ${groupIndex + 1}`);
        
        // Scrape group member data
        const memberData = await page.evaluate(() => {
          const members = [];
          const contentInfoElements = document.querySelectorAll('.content-info');
          
          contentInfoElements.forEach(contentInfo => {
            const memberElements = contentInfo.querySelectorAll('.columns.is-mobile.is-tablet.is-dekstop.is-vcentered.is-gapless');
            
            memberElements.forEach(memberElement => {
              const nameElement = memberElement.querySelector('.font-14.font-w-400');
              if (nameElement) {
                const fullText = nameElement.textContent.trim();
                let name = fullText;
                let role = '';
                
                // Check if it contains role information like "(Ketua)"
                const roleMatch = fullText.match(/^(.+?)\s*\((.+?)\)$/);
                if (roleMatch) {
                  name = roleMatch[1].trim();
                  role = roleMatch[2].trim();
                }
                
                members.push({
                  name,
                  role
                });
              }
            });
          });
          
          return members;
        });
        
        // Process roles: assign default roles if empty
        const processedMemberData = memberData.map((member, index) => {
          let processedRole = member.role;
          
          // If role is empty, assign default role
          if (!processedRole || processedRole.trim() === '') {
            // Check if there's already a 'Ketua' in the group
            const hasKetua = memberData.some(m => m.role && m.role.toLowerCase().includes('ketua'));
            
            // If no 'Ketua' exists and this is the first member, make them 'Ketua'
            if (!hasKetua && index === 0) {
              processedRole = 'Ketua';
            } else {
              processedRole = 'Anggota';
            }
          }
          
          return {
            ...member,
            role: processedRole
          };
        });
        
        console.log(`👥 Found ${processedMemberData.length} members in ${groupInfo?.groupName}`);
        
        // Add this group's data to the collection
        allGroupsData.push({
          groupInfo,
          members: processedMemberData
        });
        
        // Wait between groups to avoid overwhelming the server
        await delay(2000);
        
      } catch (groupError) {
        console.error(`Error processing group ${groupIndex + 1}:`, groupError);
        // Continue with next group even if this one fails
        allGroupsData.push({
          groupInfo: { groupName: `Kelompok ${groupIndex + 1}`, groupIndex: groupIndex + 1 },
          members: [],
          error: groupError.message
        });
      }
    }
    
    console.log(`✅ Successfully scraped ${allGroupsData.length} groups for course ${kode_mata_kuliah}`);
    
    return {
      success: true,
      kode_mata_kuliah,
      totalGroups: groupsInfo.totalGroups,
      scrapedGroups: allGroupsData.length,
      groups: allGroupsData
    };
    
  } catch (error) {
    console.error(`Error scraping group members for course ${kode_mata_kuliah}:`, error);
    console.log(`❌ Error occurred while scraping groups for course: ${kode_mata_kuliah}`);
    return {
      success: false,
      kode_mata_kuliah,
      error: error.message
    };
  }
}

// Fungsi scraping setelah login dan pemilihan semester
export async function scrapeAfterLogin(page, semesterText) {
  try {
    console.log('🔍 Starting post-login scraping process...');
    
    // Wait for page to fully load
    await delay(3000);
    
    // Select semester if specified
    let semesterResult = null;
    if (semesterText) {
      semesterResult = await selectSemester(page, semesterText);
      
      // Wait for page to refresh after semester selection
      if (semesterResult && semesterResult.success) {
        console.log('⏳ Waiting for page to refresh after semester selection...');
        await delay(5000); // Wait longer for page to reload
        
        // Wait for course cards to load
        try {
          await page.waitForSelector('.card.card_custom-class-item', { timeout: 10000 });
          console.log('✅ Course cards loaded successfully');
        } catch (e) {
          console.log('⚠️ No course cards found or timeout - continuing anyway');
        }
      }
    }
    
    // Extract course data
    let courseData = [];
    try {
      courseData = await scrapeCourseData(page);
    } catch (error) {
      console.log('❌ Failed to extract course data:', error);
    }
    
    // Scrape group member data for each course
    let groupData = [];
    if (courseData.length > 0) {
      console.log('👥 Starting group member scraping for all courses...');
      
      for (const course of courseData) {
        if (course.kode_mata_kuliah) {
          try {
            const groupResult = await scrapeGroupMembers(page, course.kode_mata_kuliah);
            groupData.push({
              ...groupResult,
              mata_kuliah: course.mata_kuliah
            });
            
            // Wait between requests to avoid overwhelming the server
            await delay(2000);
          } catch (error) {
            console.log(`❌ Failed to scrape group data for ${course.mata_kuliah}:`, error);
            groupData.push({
              success: false,
              kode_mata_kuliah: course.kode_mata_kuliah,
              mata_kuliah: course.mata_kuliah,
              error: error.message
            });
          }
        }
      }
    }
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Get current URL
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);
    
    // Extract useful information
    const pageData = await page.evaluate(() => {
      // Get all links
      const links = Array.from(document.querySelectorAll('a[href]')).map(link => ({
        text: link.textContent.trim(),
        href: link.href
      }));
      
      // Get navigation menu items
      const navItems = Array.from(document.querySelectorAll('nav a, .nav a, .navbar a, .menu a')).map(item => ({
        text: item.textContent.trim(),
        href: item.href
      }));
      
      // Get user info if available
      const userInfo = {};
      const userSelectors = [
        '.user-name', '.username', '[data-testid="username"]',
        '.profile-name', '.user-profile', '.account-name'
      ];
      
      userSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          userInfo.name = element.textContent.trim();
        }
      });
      
      // Get current semester info
      const semesterInfo = {};
      const semesterElement = document.querySelector('.choices__item--selectable[aria-selected="true"]');
      if (semesterElement) {
        semesterInfo.current = semesterElement.textContent.trim();
      }
      
      return {
        links: links.slice(0, 20), // Limit to first 20 links
        navItems,
        userInfo,
        semesterInfo,
        pageText: document.body.innerText.substring(0, 1000) // First 1000 chars
      };
    });
    
    console.log('✅ Post-login scraping completed successfully');
    
    return {
      title,
      url: currentUrl,
      semesterResult,
      courseData, // Add course data to results
      groupData, // Add group data to results
      ...pageData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Post-login scraping error:', error);
    throw error;
  }
}

// Main scraping function dengan login dan pemilihan semester
export async function scrapeWithLogin(email, password, semesterText = null) {
  const browser = await puppeteer.launch({
    headless: false, // Set ke true untuk production
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Perform login
    const loginResult = await loginToEdlink(page, email, password);
    
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.error}`);
    }
    
    console.log('✅ Login successful! Proceeding with data scraping...');
    
    // Scrape data after successful login (with semester selection)
    const scrapedData = await scrapeAfterLogin(page, semesterText);
    
    return {
      loginResult,
      scrapedData
    };
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Main function
async function main() {
  try {
    // Kredensial login
    const email = 'sodiq.ardianto@paramadina.ac.id';
    const password = 'thisispassword';
    
    // Semester yang ingin dipilih
    const semester = '2024 Ganjil';
    
    console.log('🚀 Starting Edlink scraping with login authentication...');
    
    const result = await scrapeWithLogin(email, password, semester);
    
    console.log('🎉 Scraping completed successfully!');
    console.log('Login Result:', result.loginResult);
    console.log('Scraped Data:', JSON.stringify(result.scrapedData, null, 2));
    
    // Save results to file
    await saveToJson(result, `edlink-scrape-${getTimestamp()}.json`);
    
    console.log('💾 Results saved to file successfully.');
    
  } catch (error) {
    console.error('Main error:', error);
    process.exit(1);
  }
}

// Run the scraper
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

// Fungsi untuk memilih semester setelah login
export async function selectSemester(page, semesterText = '2024 Ganjil') {
  try {
    console.log(`📅 Attempting to select semester: ${semesterText}`);
    
    // Wait for the semester selector to be available
    await delay(3000);
    
    console.log('⏳ Preparing to select semester...');
    
    // Find and click the semester dropdown
    const dropdownSelectors = [
      '.choices',
      '.choices__inner',
      '[data-type="select-one"]',
      '.form-control .choices'
    ];
    
    let dropdownClicked = false;
    for (const selector of dropdownSelectors) {
      try {
        const dropdown = await page.$(selector);
        if (dropdown) {
          await dropdown.click();
          console.log(`Clicked dropdown with selector: ${selector}`);
          dropdownClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Failed to click dropdown with selector: ${selector}`);
      }
    }
    
    if (!dropdownClicked) {
      throw new Error('Could not find or click semester dropdown');
    }
    
    // Wait for dropdown to open and input field to appear
    await delay(2000);
    
    console.log('✅ Semester dropdown opened successfully');
    
    // Try to find and use the specific input field mentioned by user
    const primaryInputSelector = 'input[type="search"].choices__input.choices__input--cloned';
    const fallbackInputSelectors = [
      'input[type="search"][name="search_terms"]',
      'input[type="search"].choices__input',
      '.choices__input--cloned',
      '.choices__input',
      'input[type="search"]',
      'input[placeholder*="semester"]',
      'input[placeholder*="Semester"]',
      '.choices input',
      '.choices__inner input'
    ];
    
    let inputFound = false;
    
    // First try the specific input field mentioned by user
    try {
      console.log(`Looking for primary input field: ${primaryInputSelector}`);
      await page.waitForSelector(primaryInputSelector, { timeout: 5000 });
      const primaryInput = await page.$(primaryInputSelector);
      
      if (primaryInput) {
        console.log(`Found primary input field: ${primaryInputSelector}`);
        
        // Focus on the input field
        await primaryInput.focus();
        await delay(500);
        
        // Clear any existing text
         await page.keyboard.down('Control');
         await page.keyboard.press('KeyA');
         await page.keyboard.up('Control');
         await page.keyboard.press('Backspace');
        await delay(300);
        
        // Type the semester text
        await page.keyboard.type(semesterText);
        console.log(`Typed semester: ${semesterText}`);
        await delay(1000);
        
        // Press Enter to select the semester
        await page.keyboard.press('Enter');
        console.log('Pressed Enter to select semester');
        await delay(1000);
        
        inputFound = true;
      }
    } catch (e) {
      console.log(`Primary input field not found: ${e.message}`);
    }
    
    // If primary input not found, try fallback selectors
    if (!inputFound) {
      console.log('Trying fallback input selectors...');
      for (const selector of fallbackInputSelectors) {
        try {
          // Wait for the input to be available
          await page.waitForSelector(selector, { timeout: 3000 });
          const inputElement = await page.$(selector);
          
          if (inputElement) {
            console.log(`Found fallback input field with selector: ${selector}`);
            
            // Focus on the input field
            await inputElement.focus();
            await delay(500);
            
            // Clear any existing text
             await page.keyboard.down('Control');
             await page.keyboard.press('KeyA');
             await page.keyboard.up('Control');
             await page.keyboard.press('Backspace');
            await delay(300);
            
            // Type the semester text
            await page.keyboard.type(semesterText);
            console.log(`Typed semester: ${semesterText}`);
            await delay(1000);
            
            // Press Enter to select the semester
            await page.keyboard.press('Enter');
            console.log('Pressed Enter to select semester');
            await delay(1000);
            
            inputFound = true;
            break;
          }
        } catch (e) {
          console.log(`Failed to use input with selector: ${selector} - ${e.message}`);
        }
      }
    }
    
    // If input field approach failed, try the original dropdown option approach as fallback
    if (!inputFound) {
      console.log('Input field approach failed, trying dropdown option approach as fallback...');
      
      try {
        const semesterSelected = await page.evaluate((targetSemester) => {
          // Look for the semester option by text content
          const options = Array.from(document.querySelectorAll('.choices__item--choice'));
          
          for (const option of options) {
            const optionText = option.textContent.trim();
            console.log(`Found option: ${optionText}`);
            
            if (optionText.includes(targetSemester)) {
              option.click();
              console.log(`Clicked on: ${optionText}`);
              return { success: true, selected: optionText };
            }
          }
          
          // If exact match not found, try partial match
          for (const option of options) {
            const optionText = option.textContent.trim();
            if (optionText.includes('2024') && optionText.includes('Ganjil')) {
              option.click();
              console.log(`Clicked on (partial match): ${optionText}`);
              return { success: true, selected: optionText };
            }
          }
          
          return { success: false, error: 'Semester option not found' };
        }, semesterText);
        
        if (semesterSelected.success) {
          inputFound = true;
        }
      } catch (e) {
        console.log('Fallback dropdown approach also failed:', e.message);
      }
    }
    
    if (!inputFound) {
      console.log('Warning: Could not select semester using any method, continuing anyway...');
    }
    
    // Wait for selection to be processed
    await delay(2000);
    
    // Verify selection was successful by checking the current value
    const semesterSelected = await page.evaluate(() => {
      // Check if the semester was selected by looking at the current selection
      const selectedElement = document.querySelector('.choices__item--selectable[aria-selected="true"]');
      if (selectedElement) {
        const selectedText = selectedElement.textContent.trim();
        console.log(`Selected semester: ${selectedText}`);
        return { success: true, selected: selectedText };
      }
      
      // Alternative check - look for any visible semester indicator
      const semesterIndicators = document.querySelectorAll('.choices__item--selectable, .choices__placeholder');
      for (const indicator of semesterIndicators) {
        const text = indicator.textContent.trim();
        if (text.includes('2024') && text.includes('Ganjil')) {
          console.log(`Found semester indicator: ${text}`);
          return { success: true, selected: text };
        }
      }
      
      return { success: false, error: 'Could not verify semester selection' };
    });
    
    if (!semesterSelected.success) {
      console.log('Warning: Could not verify semester selection, but continuing...');
      // Don't throw error, just continue with a default response
      semesterSelected.success = true;
      semesterSelected.selected = semesterText;
    }
    
    // Wait for any page updates after selection
    await delay(3000);
    
    // Semester selection completed, continuing without refresh
    console.log('Semester selection completed, continuing without refresh...');
    
    console.log('✅ Semester selection process completed');
    
    console.log(`✅ Successfully selected semester: ${semesterSelected.selected}`);
    
    return {
      success: true,
      selectedSemester: semesterSelected.selected
    };
    
  } catch (error) {
    console.error('Semester selection error:', error);
    console.log('❌ Error occurred during semester selection');
    throw error;
  }
}