import { EventEmitter } from 'events';

// Global EventEmitter instance untuk komunikasi status scraping
class ScrapingEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // Increase limit untuk multiple concurrent requests
  }

  /**
   * Emit status update dengan format standar
   * @param {string} sessionId - Unique identifier untuk session scraping
   * @param {string} status - Status step (start, login, scraping, processing, saving, complete, error)
   * @param {string} message - Deskripsi detail dari status
   * @param {Object} data - Optional data tambahan
   */
  emitStatus(sessionId, status, message, data = {}) {
    const statusData = {
      sessionId,
      status,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };

    console.log(`[${sessionId}] ${status}: ${message}`);
    this.emit('status', statusData);
    this.emit(`status:${sessionId}`, statusData);
  }

  /**
   * Emit error dengan format standar
   * @param {string} sessionId - Unique identifier untuk session scraping
   * @param {string} error - Error message
   * @param {Error} errorObj - Error object untuk detail
   */
  emitError(sessionId, error, errorObj = null) {
    const errorData = {
      sessionId,
      status: 'error',
      message: error,
      timestamp: new Date().toISOString(),
      error: errorObj ? {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      } : null
    };

    console.error(`[${sessionId}] ERROR: ${error}`, errorObj);
    this.emit('error', errorData);
    this.emit(`error:${sessionId}`, errorData);
    this.emit(`status:${sessionId}`, errorData);
  }

  /**
   * Emit completion dengan summary data
   * @param {string} sessionId - Unique identifier untuk session scraping
   * @param {Object} summary - Summary data dari scraping
   */
  emitComplete(sessionId, summary = {}) {
    const completeData = {
      sessionId,
      status: 'complete',
      message: 'Scraping selesai',
      timestamp: new Date().toISOString(),
      summary
    };

    console.log(`[${sessionId}] COMPLETE:`, summary);
    this.emit('complete', completeData);
    this.emit(`complete:${sessionId}`, completeData);
    this.emit(`status:${sessionId}`, completeData);
  }

  /**
   * Generate unique session ID
   * @returns {string} Unique session identifier
   */
  generateSessionId() {
    return `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up listeners untuk session tertentu
   * @param {string} sessionId - Session ID yang akan dibersihkan
   */
  cleanupSession(sessionId) {
    this.removeAllListeners(`status:${sessionId}`);
    this.removeAllListeners(`error:${sessionId}`);
    this.removeAllListeners(`complete:${sessionId}`);
    console.log(`[${sessionId}] Session cleanup completed`);
  }
}

// Export singleton instance
const scrapingEmitter = new ScrapingEventEmitter();
export default scrapingEmitter;

// Export class untuk testing
export { ScrapingEventEmitter };