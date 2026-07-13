export interface LearningResource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'tutorial' | 'glossary' | 'calculator' | 'quiz';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  topics: string[];
  url?: string;
  content?: string;
  prerequisites?: string[];
  relatedResources?: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in hours
  resources: string[]; // resource IDs
  order: number;
}

export interface UserProgress {
  userId: string;
  completedResources: string[];
  inProgressResources: string[];
  learningPaths: {
    pathId: string;
    progress: number; // 0-100
    startedAt: string;
    completedAt?: string;
  }[];
  preferences: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topics: string[];
    learningStyle: 'visual' | 'text' | 'interactive';
  };
}

export class LearningResourcesService {
  private resources: LearningResource[] = [
    // Beginner Resources
    {
      id: 'basics-1',
      title: 'What is Stock Market?',
      description: 'Learn the fundamentals of how stock markets work',
      type: 'article',
      difficulty: 'beginner',
      duration: 10,
      topics: ['basics', 'market', 'stocks'],
      content: 'The stock market is a place where people buy and sell shares of companies...'
    },
    {
      id: 'basics-2',
      title: 'Understanding Stock Prices',
      description: 'How stock prices are determined and what affects them',
      type: 'video',
      difficulty: 'beginner',
      duration: 15,
      topics: ['pricing', 'valuation', 'market-forces'],
      url: 'https://example.com/stock-prices'
    },
    {
      id: 'basics-3',
      title: 'Risk vs Return',
      description: 'Learn the fundamental relationship between risk and return',
      type: 'tutorial',
      difficulty: 'beginner',
      duration: 20,
      topics: ['risk', 'return', 'diversification'],
      prerequisites: ['basics-1']
    },
    
    // Intermediate Resources
    {
      id: 'intermediate-1',
      title: 'Technical Analysis Basics',
      description: 'Introduction to charts, patterns, and technical indicators',
      type: 'tutorial',
      difficulty: 'intermediate',
      duration: 30,
      topics: ['technical-analysis', 'charts', 'indicators'],
      prerequisites: ['basics-1', 'basics-2']
    },
    {
      id: 'intermediate-2',
      title: 'Fundamental Analysis',
      description: 'How to analyze company financials and value stocks',
      type: 'article',
      difficulty: 'intermediate',
      duration: 25,
      topics: ['fundamental-analysis', 'financials', 'valuation'],
      prerequisites: ['basics-1']
    },
    {
      id: 'intermediate-3',
      title: 'Portfolio Diversification',
      description: 'Building a balanced portfolio across different assets',
      type: 'tutorial',
      difficulty: 'intermediate',
      duration: 20,
      topics: ['diversification', 'portfolio', 'asset-allocation'],
      prerequisites: ['basics-3']
    },
    
    // Advanced Resources
    {
      id: 'advanced-1',
      title: 'Options Trading Strategies',
      description: 'Advanced options strategies for experienced investors',
      type: 'tutorial',
      difficulty: 'advanced',
      duration: 45,
      topics: ['options', 'derivatives', 'strategies'],
      prerequisites: ['intermediate-1', 'intermediate-2']
    },
    {
      id: 'advanced-2',
      title: 'Quantitative Analysis',
      description: 'Using mathematical models in investment decisions',
      type: 'article',
      difficulty: 'advanced',
      duration: 40,
      topics: ['quantitative', 'models', 'algorithms'],
      prerequisites: ['intermediate-2']
    },
    
    // Tools and Calculators
    {
      id: 'tool-1',
      title: 'Compound Interest Calculator',
      description: 'Calculate how your investments grow over time',
      type: 'calculator',
      difficulty: 'beginner',
      duration: 5,
      topics: ['compound-interest', 'calculators', 'planning']
    },
    {
      id: 'tool-2',
      title: 'Risk Assessment Quiz',
      description: 'Determine your risk tolerance and investment style',
      type: 'quiz',
      difficulty: 'beginner',
      duration: 10,
      topics: ['risk-tolerance', 'assessment', 'psychology']
    },
    
    // Glossary
    {
      id: 'glossary-1',
      title: 'Investment Terms Glossary',
      description: 'Comprehensive dictionary of investment terminology',
      type: 'glossary',
      difficulty: 'beginner',
      duration: 0,
      topics: ['terminology', 'definitions', 'reference']
    }
  ];

  private learningPaths: LearningPath[] = [
    {
      id: 'beginner-path',
      title: 'Stock Market Fundamentals',
      description: 'Complete beginner guide to understanding stocks and investing',
      difficulty: 'beginner',
      estimatedTime: 2,
      resources: ['basics-1', 'basics-2', 'basics-3', 'tool-2'],
      order: 1
    },
    {
      id: 'intermediate-path',
      title: 'Investment Analysis',
      description: 'Learn to analyze stocks and build a portfolio',
      difficulty: 'intermediate',
      estimatedTime: 4,
      resources: ['intermediate-1', 'intermediate-2', 'intermediate-3', 'tool-1'],
      order: 2
    },
    {
      id: 'advanced-path',
      title: 'Advanced Trading Strategies',
      description: 'Master advanced investment techniques',
      difficulty: 'advanced',
      estimatedTime: 6,
      resources: ['advanced-1', 'advanced-2'],
      order: 3
    }
  ];

  /**
   * Get resources by topic or difficulty
   */
  getResources(filters?: {
    topics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    type?: string;
  }): LearningResource[] {
    let filtered = [...this.resources];

    if (filters?.topics) {
      filtered = filtered.filter(resource => 
        filters.topics!.some(topic => resource.topics.includes(topic))
      );
    }

    if (filters?.difficulty) {
      filtered = filtered.filter(resource => resource.difficulty === filters.difficulty);
    }

    if (filters?.type) {
      filtered = filtered.filter(resource => resource.type === filters.type);
    }

    return filtered;
  }

  /**
   * Get learning paths
   */
  getLearningPaths(): LearningPath[] {
    return this.learningPaths;
  }

  /**
   * Get recommended resources based on user context
   */
  getRecommendedResources(context: any, userProgress?: UserProgress): LearningResource[] {
    const recommendations: LearningResource[] = [];

    // Context-based recommendations
    if (context.screen === 'portfolio') {
      recommendations.push(...this.getResources({ topics: ['portfolio', 'diversification'] }));
    }

    if (context.screen === 'stock-detail') {
      recommendations.push(...this.getResources({ topics: ['analysis', 'valuation'] }));
    }

    if (context.screen === 'discover') {
      recommendations.push(...this.getResources({ topics: ['research', 'analysis'] }));
    }

    // Progress-based recommendations
    if (userProgress) {
      const completedTopics = this.getCompletedTopics(userProgress);
      const nextLevel = this.getNextDifficultyLevel(userProgress.preferences.difficulty);
      
      if (nextLevel) {
        recommendations.push(...this.getResources({ difficulty: nextLevel }));
      }
    }

    // Remove duplicates and return top 5
    const unique = recommendations.filter((resource, index, self) => 
      index === self.findIndex(r => r.id === resource.id)
    );

    return unique.slice(0, 5);
  }

  /**
   * Get resources related to a specific topic
   */
  getRelatedResources(topic: string): LearningResource[] {
    return this.resources.filter(resource => 
      resource.topics.includes(topic.toLowerCase()) ||
      resource.title.toLowerCase().includes(topic.toLowerCase()) ||
      resource.description.toLowerCase().includes(topic.toLowerCase())
    );
  }

  /**
   * Get quick learning resources (under 10 minutes)
   */
  getQuickResources(): LearningResource[] {
    return this.resources.filter(resource => resource.duration <= 10);
  }

  /**
   * Search resources by query
   */
  searchResources(query: string): LearningResource[] {
    const lowerQuery = query.toLowerCase();
    return this.resources.filter(resource => 
      resource.title.toLowerCase().includes(lowerQuery) ||
      resource.description.toLowerCase().includes(lowerQuery) ||
      resource.topics.some(topic => topic.includes(lowerQuery))
    );
  }

  /**
   * Get learning path by ID
   */
  getLearningPath(pathId: string): LearningPath | undefined {
    return this.learningPaths.find(path => path.id === pathId);
  }

  /**
   * Get resource by ID
   */
  getResource(resourceId: string): LearningResource | undefined {
    return this.resources.find(resource => resource.id === resourceId);
  }

  /**
   * Get completed topics from user progress
   */
  private getCompletedTopics(userProgress: UserProgress): string[] {
    const completedResources = userProgress.completedResources.map(id => 
      this.getResource(id)
    ).filter(Boolean) as LearningResource[];

    return completedResources.flatMap(resource => resource.topics);
  }

  /**
   * Get next difficulty level
   */
  private getNextDifficultyLevel(current: string): string | null {
    switch (current) {
      case 'beginner': return 'intermediate';
      case 'intermediate': return 'advanced';
      default: return null;
    }
  }

  /**
   * Generate learning suggestions based on AI conversation
   */
  generateLearningSuggestions(conversationContext: any): string[] {
    const suggestions: string[] = [];

    // Topic-based suggestions
    if (conversationContext.includes('portfolio') || conversationContext.includes('diversification')) {
      suggestions.push('Learn about portfolio diversification strategies');
      suggestions.push('Understand asset allocation principles');
    }

    if (conversationContext.includes('analysis') || conversationContext.includes('valuation')) {
      suggestions.push('Master fundamental analysis techniques');
      suggestions.push('Learn technical analysis basics');
    }

    if (conversationContext.includes('risk') || conversationContext.includes('volatility')) {
      suggestions.push('Understand investment risk management');
      suggestions.push('Learn about risk tolerance assessment');
    }

    if (conversationContext.includes('market') || conversationContext.includes('trends')) {
      suggestions.push('Study market cycles and trends');
      suggestions.push('Learn about economic indicators');
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}

export const learningResourcesService = new LearningResourcesService();
