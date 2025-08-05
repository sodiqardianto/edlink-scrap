import puppeteer from 'puppeteer';
import prisma from './lib/prisma.js';
import { loginToEdlink } from './auth.js';
import { selectSemester } from './semesterSelector.js';
import { scrapeCourseData } from './scraper.js';
import { scrapeGroupMembers } from './groupScraper.js';
import { delay } from './utils.js';

export async function runScraper({ email, password, semester }) {
  let browser;
  let page;
  
  try {
    console.log('🚀 Starting scraper service...');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginResult = await loginToEdlink(page, email, password);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
    }
    
    // Step 2: Select semester
    console.log(`📅 Selecting semester: ${semester}`);
    const semesterSuccess = await selectSemester(page, semester);
    if (!semesterSuccess) {
      throw new Error('Semester selection failed');
    }
    
    // Step 3: Scrape course data
    console.log('📚 Scraping course data...');
    const courseData = await scrapeCourseData(page);
    
    if (!courseData || courseData.length === 0) {
      throw new Error('No course data found');
    }
    
    console.log(`✅ Found ${courseData.length} courses`);
    
    // Step 4: Save courses and scrape groups
    const savedCourses = [];
    
    for (const course of courseData) {
      try {
        console.log(`💾 Saving course: ${course.nama_mata_kuliah}`);
        
        // Save or update course
        const savedCourse = await prisma.course.upsert({
          where: { kode: course.kode_mata_kuliah },
          update: {
            nama: course.nama_mata_kuliah,
            semester: semester
          },
          create: {
            kode: course.kode_mata_kuliah,
            nama: course.nama_mata_kuliah,
            semester: semester
          }
        });
        
        // Step 5: Scrape group members for this course
        console.log(`👥 Scraping groups for course: ${course.nama_mata_kuliah}`);
        const groupsData = await scrapeGroupMembers(page, course.kode_mata_kuliah);
        
        // Save groups and members
        const savedGroups = [];
        
        for (const groupData of groupsData) {
          // Save or update group
          const savedGroup = await prisma.group.upsert({
            where: {
              courseId_nama: {
                courseId: savedCourse.id,
                nama: groupData.groupName
              }
            },
            update: {},
            create: {
              nama: groupData.groupName,
              courseId: savedCourse.id
            }
          });
          
          // Delete existing members for this group
          await prisma.member.deleteMany({
            where: { groupId: savedGroup.id }
          });
          
          // Save members
          const savedMembers = [];
          
          for (const member of groupData.members) {
            const savedMember = await prisma.member.create({
              data: {
                nama: member.nama,
                peran: member.peran,
                groupId: savedGroup.id
              }
            });
            savedMembers.push(savedMember);
          }
          
          savedGroups.push({
            ...savedGroup,
            members: savedMembers
          });
        }
        
        savedCourses.push({
          ...savedCourse,
          groups: savedGroups
        });
        
        console.log(`✅ Saved ${savedGroups.length} groups for course: ${course.nama_mata_kuliah}`);
        
      } catch (error) {
        console.error(`❌ Error processing course ${course.nama_mata_kuliah}:`, error);
        // Continue with next course
      }
    }
    
    console.log('🎉 Scraping completed successfully!');
    
    return {
      semester,
      coursesCount: savedCourses.length,
      courses: savedCourses
    };
    
  } catch (error) {
    console.error('❌ Scraper service error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
}