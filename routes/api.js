import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import { runScraper } from '../scraperService.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// POST /api/scrape - Start scraping process
router.post('/scrape', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  body('semester').isLength({ min: 1 }).withMessage('Semester is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password, semester } = req.body;
    
    console.log(`🔄 Starting scrape for ${email}, semester: ${semester}`);
    
    // Run the scraper
    const result = await runScraper({ email, password, semester });
    
    res.json({
      success: true,
      message: 'Scraping completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: 'Scraping failed',
      message: error.message
    });
  }
});

// GET /api/courses - Get all courses
router.get('/courses', async (req, res) => {
  try {
    const { semester } = req.query;
    
    const whereClause = semester ? { semester } : {};
    
    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        groups: {
          include: {
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
      message: error.message
    });
  }
});

// GET /api/courses/:id - Get specific course
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        groups: {
          include: {
            members: true
          }
        }
      }
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
      message: error.message
    });
  }
});

// GET /api/courses/:id/groups - Get groups for a specific course
router.get('/courses/:id/groups', async (req, res) => {
  try {
    const { id } = req.params;
    
    const groups = await prisma.group.findMany({
      where: { courseId: parseInt(id) },
      include: {
        members: true,
        course: {
          select: {
            id: true,
            kode: true,
            nama: true,
            semester: true
          }
        }
      },
      orderBy: {
        nama: 'asc'
      }
    });
    
    res.json({
      success: true,
      data: groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups',
      message: error.message
    });
  }
});

// GET /api/groups/:id/members - Get members for a specific group
router.get('/groups/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    
    const members = await prisma.member.findMany({
      where: { groupId: parseInt(id) },
      include: {
        group: {
          include: {
            course: {
              select: {
                id: true,
                kode: true,
                nama: true,
                semester: true
              }
            }
          }
        }
      },
      orderBy: {
        nama: 'asc'
      }
    });
    
    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
      message: error.message
    });
  }
});

// DELETE /api/courses/:id - Delete a course and all its data
router.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }
    
    await prisma.course.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course',
      message: error.message
    });
  }
});

export default router;