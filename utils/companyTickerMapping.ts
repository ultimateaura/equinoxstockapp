/**
 * Company Name to Ticker Symbol Mapping Service
 * Maps common company names to their stock ticker symbols
 */

export interface CompanyMapping {
  name: string;
  ticker: string;
  aliases: string[];
}

export class CompanyTickerMappingService {
  private static readonly COMPANY_MAPPINGS: CompanyMapping[] = [
    // Technology Giants
    { name: 'Apple', ticker: 'AAPL', aliases: ['Apple Inc', 'Apple Computer', 'iPhone', 'iPad', 'Mac'] },
    { name: 'Microsoft', ticker: 'MSFT', aliases: ['Microsoft Corporation', 'Windows', 'Office', 'Azure', 'Xbox'] },
    { name: 'Google', ticker: 'GOOGL', aliases: ['Alphabet', 'Google Inc', 'YouTube', 'Android', 'Chrome', 'Search'] },
    { name: 'Amazon', ticker: 'AMZN', aliases: ['Amazon.com', 'AWS', 'Prime', 'Alexa', 'Echo'] },
    { name: 'Tesla', ticker: 'TSLA', aliases: ['Tesla Motors', 'Tesla Inc', 'Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'] },
    { name: 'Meta', ticker: 'META', aliases: ['Facebook', 'Meta Platforms', 'Instagram', 'WhatsApp', 'Oculus', 'VR'] },
    { name: 'Netflix', ticker: 'NFLX', aliases: ['Netflix Inc', 'Streaming'] },
    { name: 'Nvidia', ticker: 'NVDA', aliases: ['NVIDIA Corporation', 'GPU', 'AI', 'Graphics'] },
    { name: 'Intel', ticker: 'INTC', aliases: ['Intel Corporation', 'Processors', 'Chips'] },
    { name: 'AMD', ticker: 'AMD', aliases: ['Advanced Micro Devices', 'Ryzen', 'Radeon'] },
    
    // Financial Services
    { name: 'JPMorgan', ticker: 'JPM', aliases: ['JPMorgan Chase', 'JP Morgan', 'Chase Bank', 'JPM'] },
    { name: 'Bank of America', ticker: 'BAC', aliases: ['BofA', 'Bank of America Corporation'] },
    { name: 'Wells Fargo', ticker: 'WFC', aliases: ['Wells Fargo & Company', 'Wells Fargo Bank'] },
    { name: 'Goldman Sachs', ticker: 'GS', aliases: ['Goldman Sachs Group', 'Goldman'] },
    { name: 'Morgan Stanley', ticker: 'MS', aliases: ['Morgan Stanley & Co'] },
    { name: 'Visa', ticker: 'V', aliases: ['Visa Inc', 'Credit Cards'] },
    { name: 'Mastercard', ticker: 'MA', aliases: ['Mastercard Inc', 'Credit Cards'] },
    { name: 'American Express', ticker: 'AXP', aliases: ['Amex', 'AMEX', 'Credit Cards'] },
    { name: 'PayPal', ticker: 'PYPL', aliases: ['PayPal Holdings', 'Digital Payments'] },
    { name: 'Square', ticker: 'SQ', aliases: ['Block Inc', 'Cash App', 'Bitcoin'] },
    
    // Healthcare & Pharmaceuticals
    { name: 'Johnson & Johnson', ticker: 'JNJ', aliases: ['J&J', 'Johnson Johnson', 'Band-Aid', 'Tylenol'] },
    { name: 'Pfizer', ticker: 'PFE', aliases: ['Pfizer Inc', 'Pharmaceuticals', 'COVID Vaccine'] },
    { name: 'Moderna', ticker: 'MRNA', aliases: ['Moderna Inc', 'COVID Vaccine', 'mRNA'] },
    { name: 'UnitedHealth', ticker: 'UNH', aliases: ['UnitedHealth Group', 'Health Insurance'] },
    { name: 'Merck', ticker: 'MRK', aliases: ['Merck & Co', 'Pharmaceuticals'] },
    { name: 'AbbVie', ticker: 'ABBV', aliases: ['AbbVie Inc', 'Humira'] },
    
    // Consumer & Retail
    { name: 'Walmart', ticker: 'WMT', aliases: ['Walmart Inc', 'Walmart Stores', 'Sam\'s Club'] },
    { name: 'Target', ticker: 'TGT', aliases: ['Target Corporation', 'Target Stores'] },
    { name: 'Home Depot', ticker: 'HD', aliases: ['Home Depot Inc', 'Hardware Store'] },
    { name: 'Lowe\'s', ticker: 'LOW', aliases: ['Lowe\'s Companies', 'Hardware Store'] },
    { name: 'Costco', ticker: 'COST', aliases: ['Costco Wholesale', 'Wholesale Club'] },
    { name: 'Nike', ticker: 'NKE', aliases: ['Nike Inc', 'Athletic Shoes', 'Sneakers'] },
    { name: 'Coca-Cola', ticker: 'KO', aliases: ['Coca Cola', 'Coke', 'Soft Drinks'] },
    { name: 'Pepsi', ticker: 'PEP', aliases: ['PepsiCo', 'Pepsi Cola', 'Soft Drinks'] },
    { name: 'McDonald\'s', ticker: 'MCD', aliases: ['McDonald\'s Corporation', 'Fast Food'] },
    { name: 'Starbucks', ticker: 'SBUX', aliases: ['Starbucks Corporation', 'Coffee'] },
    
    // Energy & Utilities
    { name: 'Exxon Mobil', ticker: 'XOM', aliases: ['Exxon', 'ExxonMobil', 'Oil', 'Gas'] },
    { name: 'Chevron', ticker: 'CVX', aliases: ['Chevron Corporation', 'Oil', 'Gas'] },
    { name: 'ConocoPhillips', ticker: 'COP', aliases: ['Conoco Phillips', 'Oil', 'Gas'] },
    
    // Automotive
    { name: 'Ford', ticker: 'F', aliases: ['Ford Motor Company', 'Ford Motors', 'Cars'] },
    { name: 'General Motors', ticker: 'GM', aliases: ['GM', 'General Motors Company', 'Cars'] },
    { name: 'Toyota', ticker: 'TM', aliases: ['Toyota Motor Corporation', 'Cars'] },
    { name: 'Honda', ticker: 'HMC', aliases: ['Honda Motor Company', 'Cars'] },
    
    // Entertainment & Media
    { name: 'Disney', ticker: 'DIS', aliases: ['Walt Disney', 'Disney Corporation', 'Movies', 'Theme Parks'] },
    { name: 'Comcast', ticker: 'CMCSA', aliases: ['Comcast Corporation', 'Xfinity', 'NBC'] },
    { name: 'ViacomCBS', ticker: 'VIAC', aliases: ['Viacom', 'CBS', 'Paramount'] },
    
    // Telecommunications
    { name: 'Verizon', ticker: 'VZ', aliases: ['Verizon Communications', 'Cell Phone', 'Wireless'] },
    { name: 'AT&T', ticker: 'T', aliases: ['AT&T Inc', 'Telecommunications', 'Wireless'] },
    { name: 'T-Mobile', ticker: 'TMUS', aliases: ['T-Mobile US', 'Sprint', 'Wireless'] },
    
    // Software & Cloud
    { name: 'Salesforce', ticker: 'CRM', aliases: ['Salesforce.com', 'CRM Software', 'Cloud'] },
    { name: 'Adobe', ticker: 'ADBE', aliases: ['Adobe Inc', 'Photoshop', 'Creative Suite'] },
    { name: 'Oracle', ticker: 'ORCL', aliases: ['Oracle Corporation', 'Database', 'Cloud'] },
    { name: 'IBM', ticker: 'IBM', aliases: ['International Business Machines', 'Big Blue', 'Cloud'] },
    { name: 'ServiceNow', ticker: 'NOW', aliases: ['ServiceNow Inc', 'IT Service Management'] },
    
    // E-commerce & Platforms
    { name: 'eBay', ticker: 'EBAY', aliases: ['eBay Inc', 'Online Marketplace'] },
    { name: 'Etsy', ticker: 'ETSY', aliases: ['Etsy Inc', 'Handmade', 'Crafts'] },
    { name: 'Shopify', ticker: 'SHOP', aliases: ['Shopify Inc', 'E-commerce Platform'] },
    { name: 'Zoom', ticker: 'ZM', aliases: ['Zoom Video Communications', 'Video Conferencing'] },
    { name: 'Slack', ticker: 'WORK', aliases: ['Slack Technologies', 'Workplace Communication'] },
    { name: 'Twitter', ticker: 'TWTR', aliases: ['Twitter Inc', 'Social Media', 'Tweets'] },
    { name: 'Snapchat', ticker: 'SNAP', aliases: ['Snap Inc', 'Social Media', 'Snap'] },
    { name: 'Pinterest', ticker: 'PINS', aliases: ['Pinterest Inc', 'Social Media', 'Pins'] },
    
    // Cryptocurrency & Fintech
    { name: 'Coinbase', ticker: 'COIN', aliases: ['Coinbase Global', 'Cryptocurrency', 'Bitcoin'] },
    { name: 'Robinhood', ticker: 'HOOD', aliases: ['Robinhood Markets', 'Trading App', 'Commission Free'] },
    { name: 'Square', ticker: 'SQ', aliases: ['Block Inc', 'Cash App', 'Bitcoin'] },
    
    // Airlines & Transportation
    { name: 'American Airlines', ticker: 'AAL', aliases: ['American Airlines Group', 'Airlines'] },
    { name: 'Delta', ticker: 'DAL', aliases: ['Delta Air Lines', 'Airlines'] },
    { name: 'Southwest', ticker: 'LUV', aliases: ['Southwest Airlines', 'Airlines'] },
    { name: 'Uber', ticker: 'UBER', aliases: ['Uber Technologies', 'Rideshare', 'Food Delivery'] },
    { name: 'Lyft', ticker: 'LYFT', aliases: ['Lyft Inc', 'Rideshare'] },
    
    // Real Estate
    { name: 'Realty Income', ticker: 'O', aliases: ['Realty Income Corporation', 'REIT', 'Real Estate'] },
    { name: 'American Tower', ticker: 'AMT', aliases: ['American Tower Corporation', 'Cell Towers', 'REIT'] },
    
    // Industrial & Manufacturing
    { name: 'Boeing', ticker: 'BA', aliases: ['Boeing Company', 'Aircraft', 'Aerospace'] },
    { name: 'Caterpillar', ticker: 'CAT', aliases: ['Caterpillar Inc', 'Heavy Machinery', 'Construction'] },
    { name: '3M', ticker: 'MMM', aliases: ['3M Company', 'Minnesota Mining', 'Industrial'] },
    { name: 'General Electric', ticker: 'GE', aliases: ['GE', 'General Electric Company', 'Industrial'] },
    
    // Food & Beverage
    { name: 'Kraft Heinz', ticker: 'KHC', aliases: ['Kraft Heinz Company', 'Food Products'] },
    { name: 'Procter & Gamble', ticker: 'PG', aliases: ['P&G', 'Procter Gamble', 'Consumer Goods'] },
    { name: 'Unilever', ticker: 'UL', aliases: ['Unilever PLC', 'Consumer Goods'] },
    
    // Biotech & Pharmaceuticals
    { name: 'Gilead Sciences', ticker: 'GILD', aliases: ['Gilead', 'Biotechnology', 'HIV Drugs'] },
    { name: 'Amgen', ticker: 'AMGN', aliases: ['Amgen Inc', 'Biotechnology', 'Biologics'] },
    { name: 'Biogen', ticker: 'BIIB', aliases: ['Biogen Inc', 'Biotechnology', 'Multiple Sclerosis'] },
    
    // Semiconductors
    { name: 'Qualcomm', ticker: 'QCOM', aliases: ['Qualcomm Inc', 'Chips', 'Wireless'] },
    { name: 'Broadcom', ticker: 'AVGO', aliases: ['Broadcom Inc', 'Chips', 'Semiconductors'] },
    { name: 'Texas Instruments', ticker: 'TXN', aliases: ['TI', 'Texas Instruments Inc', 'Chips'] },
    { name: 'Micron', ticker: 'MU', aliases: ['Micron Technology', 'Memory', 'RAM'] },
    
    // Cloud & Infrastructure
    { name: 'Cloudflare', ticker: 'NET', aliases: ['Cloudflare Inc', 'CDN', 'Internet Security'] },
    { name: 'CrowdStrike', ticker: 'CRWD', aliases: ['CrowdStrike Holdings', 'Cybersecurity'] },
    { name: 'Palo Alto Networks', ticker: 'PANW', aliases: ['Palo Alto', 'Cybersecurity', 'Firewall'] },
    { name: 'Zscaler', ticker: 'ZS', aliases: ['Zscaler Inc', 'Cybersecurity', 'Zero Trust'] },
    
    // Streaming & Entertainment
    { name: 'Spotify', ticker: 'SPOT', aliases: ['Spotify Technology', 'Music Streaming'] },
    { name: 'Roku', ticker: 'ROKU', aliases: ['Roku Inc', 'Streaming Device', 'Smart TV'] },
    { name: 'Peloton', ticker: 'PTON', aliases: ['Peloton Interactive', 'Exercise Bike', 'Fitness'] },
    
    // Gaming
    { name: 'Activision Blizzard', ticker: 'ATVI', aliases: ['Activision', 'Blizzard', 'Gaming', 'Call of Duty'] },
    { name: 'Electronic Arts', ticker: 'EA', aliases: ['EA', 'Gaming', 'FIFA', 'Madden'] },
    { name: 'Take-Two Interactive', ticker: 'TTWO', aliases: ['Take-Two', 'Gaming', 'Grand Theft Auto', 'GTA'] },
    
    // Renewable Energy
    { name: 'NextEra Energy', ticker: 'NEE', aliases: ['NextEra', 'Solar', 'Wind', 'Renewable Energy'] },
    { name: 'First Solar', ticker: 'FSLR', aliases: ['First Solar Inc', 'Solar Panels', 'Renewable Energy'] },
    { name: 'Sunrun', ticker: 'RUN', aliases: ['Sunrun Inc', 'Solar', 'Residential Solar'] },
    
    // Cannabis
    { name: 'Canopy Growth', ticker: 'CGC', aliases: ['Canopy Growth Corporation', 'Cannabis', 'Marijuana'] },
    { name: 'Aurora Cannabis', ticker: 'ACB', aliases: ['Aurora Cannabis Inc', 'Cannabis', 'Marijuana'] },
    { name: 'Tilray', ticker: 'TLRY', aliases: ['Tilray Inc', 'Cannabis', 'Marijuana'] },
    
    // Space & Aerospace
    { name: 'SpaceX', ticker: 'SPACE', aliases: ['Space Exploration Technologies', 'Rockets', 'Starlink'] },
    { name: 'Virgin Galactic', ticker: 'SPCE', aliases: ['Virgin Galactic Holdings', 'Space Tourism'] },
    { name: 'Maxar Technologies', ticker: 'MAXR', aliases: ['Maxar', 'Satellites', 'Space'] },
    
    // Electric Vehicles
    { name: 'Rivian', ticker: 'RIVN', aliases: ['Rivian Automotive', 'Electric Trucks', 'EV'] },
    { name: 'Lucid Motors', ticker: 'LCID', aliases: ['Lucid Group', 'Electric Cars', 'EV'] },
    { name: 'Nio', ticker: 'NIO', aliases: ['NIO Inc', 'Chinese EV', 'Electric Cars'] },
    { name: 'XPeng', ticker: 'XPEV', aliases: ['XPeng Inc', 'Chinese EV', 'Electric Cars'] },
    { name: 'Li Auto', ticker: 'LI', aliases: ['Li Auto Inc', 'Chinese EV', 'Electric Cars'] },
    
    // Other Notable Companies
    { name: 'Berkshire Hathaway', ticker: 'BRK.B', aliases: ['Berkshire', 'Warren Buffett', 'BRK-B'] },
    { name: 'Visa', ticker: 'V', aliases: ['Visa Inc', 'Credit Cards', 'Payments'] },
    { name: 'Mastercard', ticker: 'MA', aliases: ['Mastercard Inc', 'Credit Cards', 'Payments'] },
    { name: 'Home Depot', ticker: 'HD', aliases: ['Home Depot Inc', 'Hardware', 'DIY'] },
    { name: 'Lowe\'s', ticker: 'LOW', aliases: ['Lowe\'s Companies', 'Hardware', 'DIY'] },
  ];

  /**
   * Find ticker symbol for a company name or alias
   */
  static findTicker(companyName: string): string | null {
    if (!companyName) return null;
    
    const normalizedName = companyName.toLowerCase().trim();
    
    // Direct name match
    for (const mapping of this.COMPANY_MAPPINGS) {
      if (mapping.name.toLowerCase() === normalizedName) {
        return mapping.ticker;
      }
    }
    
    // Alias match
    for (const mapping of this.COMPANY_MAPPINGS) {
      for (const alias of mapping.aliases) {
        if (alias.toLowerCase() === normalizedName) {
          return mapping.ticker;
        }
      }
    }
    
    // Partial match (for cases like "Apple Inc" matching "Apple")
    for (const mapping of this.COMPANY_MAPPINGS) {
      if (normalizedName.includes(mapping.name.toLowerCase()) || 
          mapping.name.toLowerCase().includes(normalizedName)) {
        return mapping.ticker;
      }
      
      for (const alias of mapping.aliases) {
        if (normalizedName.includes(alias.toLowerCase()) || 
            alias.toLowerCase().includes(normalizedName)) {
          return mapping.ticker;
        }
      }
    }
    
    return null;
  }

  /**
   * Find company name for a ticker symbol
   */
  static findCompanyName(ticker: string): string | null {
    if (!ticker) return null;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    
    for (const mapping of this.COMPANY_MAPPINGS) {
      if (mapping.ticker === normalizedTicker) {
        return mapping.name;
      }
    }
    
    return null;
  }

  /**
   * Get all known company names and aliases
   */
  static getAllCompanyNames(): string[] {
    const names: string[] = [];
    
    for (const mapping of this.COMPANY_MAPPINGS) {
      names.push(mapping.name);
      names.push(...mapping.aliases);
    }
    
    return names;
  }

  /**
   * Check if a string is a known company name
   */
  static isKnownCompany(companyName: string): boolean {
    return this.findTicker(companyName) !== null;
  }

  /**
   * Get all ticker symbols
   */
  static getAllTickers(): string[] {
    return this.COMPANY_MAPPINGS.map(mapping => mapping.ticker);
  }
}

export const companyTickerMapping = new CompanyTickerMappingService();
