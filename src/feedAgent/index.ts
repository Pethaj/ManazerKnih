/**
 * Feed Agent - Export index
 */
export { processFeedAgentMessage, resetFeedAgent } from './feedAgentService';
export type { FeedAgentMessage, FeedAgentResponse } from './feedAgentService';
export {
  searchProductsByKeyword,
  searchProductsByCategory,
  getAllCategories,
  getProductCategory,
  checkProductAvailability,
  classifyOilProducts,
  matchProductsByName,
  getProductByCode,
  getDatabaseStats,
  classifyProductsList,
} from './feedAgentTools';
export type { ToolResult } from './feedAgentTools';
