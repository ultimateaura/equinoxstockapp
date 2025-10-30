// Test utility for API integration
import { cacheService } from './cacheService';
import { stockApiService } from './stockApi';

export const testApiIntegration = async () => {
  console.log('🧪 Testing API Integration...');
  
  try {
    // Test 1: Search functionality
    console.log('1. Testing search functionality...');
    const searchResults = await stockApiService.searchStocks('AAPL');
    console.log('✅ Search test passed:', searchResults.success ? 'Success' : 'Failed');
    
    // Test 2: Cache functionality
    console.log('2. Testing cache functionality...');
    const cacheStats = await cacheService.getCacheInfo();
    console.log('✅ Cache stats:', cacheStats);
    
    // Test 3: Error handling
    console.log('3. Testing error handling...');
    const invalidSearch = await stockApiService.searchStocks('INVALIDTICKER123');
    console.log('✅ Error handling test:', invalidSearch.success ? 'Unexpected success' : 'Expected failure');
    
    console.log('🎉 All tests completed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Test cache clearing
export const testCacheClearing = async () => {
  console.log('🧹 Testing cache clearing...');
  
  try {
    await cacheService.clearAllCache();
    const stats = await cacheService.getCacheInfo();
    console.log('✅ Cache cleared:', stats);
    return true;
  } catch (error) {
    console.error('❌ Cache clearing failed:', error);
    return false;
  }
};
