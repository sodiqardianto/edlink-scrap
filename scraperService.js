import puppeteer from 'puppeteer';
import prisma from './lib/prisma.js';
import scrapingEmitter from './eventEmitter.js';
import { loginToEdlink, selectSemester, scrapeCourseData, scrapeGroupMembers } from './index.js';
import { delay } from './utils.js';

export async function runScraper(email, password, semester, sessionId) {
  let browser;
  let page;
  const startTime = Date.now();
  
  try {
    scrapingEmitter.emitStatus(sessionId, 'initializing', 'Memulai browser...');
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Step 1: Login
    scrapingEmitter.emitStatus(sessionId, 'login', 'Melakukan login ke sistem...');
    const loginResult = await loginToEdlink(page, email, password);
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
    }
    
    scrapingEmitter.emitStatus(sessionId, 'login_success', 'Login berhasil, memilih semester...');
    
    // Step 2: Select semester
    const semesterSuccess = await selectSemester(page, semester);
    if (!semesterSuccess) {
      throw new Error('Semester selection failed');
    }
    
    // Step 3: Scrape course data
    scrapingEmitter.emitStatus(sessionId, 'scraping_courses', 'Mengambil data mata kuliah...');
    const courseData = await scrapeCourseData(page);
    
    if (!courseData || courseData.length === 0) {
      throw new Error('No course data found');
    }
    
    scrapingEmitter.emitStatus(sessionId, 'courses_found', `Ditemukan ${courseData.length} mata kuliah`, {
      totalCourses: courseData.length
    });
    
    // Step 4: Save courses and scrape groups
    const savedCourses = [];
    
    for (const [index, course] of courseData.entries()) {
      try {
        scrapingEmitter.emitStatus(sessionId, 'processing_course', `Memproses mata kuliah: ${course.nama_mata_kuliah} (${index + 1}/${courseData.length})`, {
          currentCourse: course.nama_mata_kuliah,
          progress: Math.round(((index + 1) / courseData.length) * 100)
        });
        
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
        scrapingEmitter.emitStatus(sessionId, 'scraping_groups', `Mengambil data grup untuk: ${course.nama_mata_kuliah}`);
        const groupsResult = await scrapeGroupMembers(page, course.kode_mata_kuliah);
        
        // Save groups and members
        const savedGroups = [];
        
        // Check if scraping was successful and groups exist
        if (groupsResult.success && groupsResult.groups && Array.isArray(groupsResult.groups)) {
          for (const groupData of groupsResult.groups) {
          // Save or update group
          const savedGroup = await prisma.group.upsert({
            where: {
              courseId_nama: {
                courseId: savedCourse.id,
                nama: groupData.groupInfo.groupName
              }
            },
            update: {},
            create: {
              nama: groupData.groupInfo.groupName,
              courseId: savedCourse.id
            }
          });
          
          // Delete existing members for this group
          await prisma.member.deleteMany({
            where: { groupId: savedGroup.id }
          });
          
          // Save members
          const savedMembers = [];
          
          if (groupData.members && Array.isArray(groupData.members)) {
            for (const member of groupData.members) {
              const savedMember = await prisma.member.create({
                data: {
                  nama: member.name || member.nama,
                  peran: member.role || member.peran || 'Member',
                  groupId: savedGroup.id
                }
              });
              savedMembers.push(savedMember);
            }
          }
          
          savedGroups.push({
            ...savedGroup,
            members: savedMembers
          });
          
          scrapingEmitter.emitStatus(sessionId, 'group_processed', `Grup ${groupData.groupInfo.groupName} berhasil diproses (${groupData.members ? groupData.members.length : 0} anggota)`);
          }
        } else {
          scrapingEmitter.emitStatus(sessionId, 'group_warning', `Tidak ada grup ditemukan untuk mata kuliah: ${course.nama_mata_kuliah}`);
        }
        
        savedCourses.push({
          ...savedCourse,
          groups: savedGroups
        });
        
        scrapingEmitter.emitStatus(sessionId, 'course_completed', `Mata kuliah ${course.nama_mata_kuliah} selesai diproses (${savedGroups.length} grup)`);
        
      } catch (error) {
        console.error(`❌ Error processing course ${course.nama_mata_kuliah}:`, error);
        scrapingEmitter.emitStatus(sessionId, 'course_error', `Error memproses mata kuliah ${course.nama_mata_kuliah}: ${error.message}`);
        // Continue with next course
      }
    }
    
    scrapingEmitter.emitStatus(sessionId, 'saving', 'Menyimpan data ke database...');
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const result = {
      semester,
      coursesCount: savedCourses.length,
      courses: savedCourses,
      duration: `${duration} detik`
    };
    
    scrapingEmitter.emitStatus(sessionId, 'completed', 'Scraping selesai!', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Scraper service error:', error);
    scrapingEmitter.emitStatus(sessionId, 'error', `Error: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      scrapingEmitter.emitStatus(sessionId, 'cleanup', 'Browser ditutup, proses selesai');
    }
    await prisma.$disconnect();
  }
}