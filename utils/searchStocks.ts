import { SearchResult } from '@/types/stock';
import { stockApiService } from './stockApi';

// Real-time API search function
export const searchStocksAPI = async (text: string): Promise<SearchResult[]> => {
    if (!text || text.length < 2) {
        return [];
    }

    try {
        console.log('Calling stockApiService.searchStocks with:', text);
        const response = await stockApiService.searchStocks(text);
        console.log('API response:', response);
        
        if (response.success && response.data) {
            console.log('API search successful, returning data:', response.data.length, 'results');
            return response.data;
        }
        
        console.log('API search failed. Error:', response.error);
        return [];
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Legacy function for backward compatibility - now uses API
export const searchStocks = async (text: string): Promise<SearchResult[]> => {
    return await searchStocksAPI(text);
}

// These functions are no longer needed as we use real-time data
// Keeping them for backward compatibility but they return null
export const selectStock = (text: string) => {
    console.warn('selectStock is deprecated. Use real-time API data instead.');
    return null;
}

export const selectStockPrices = (text: string) => {
    console.warn('selectStockPrices is deprecated. Use real-time API data instead.');
    return null;
}

