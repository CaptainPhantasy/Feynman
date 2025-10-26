/**
 * Concept Analyzer - Determine module decomposition for complex concepts
 */

/**
 * Analyze concept complexity and determine if modules are needed
 */
export function analyzeComplexity(concept, research) {
  const factors = {
    timeEstimate: estimateTimeRequired(research),
    prerequisites: countPrerequisites(research),
    subcomponents: identifySubcomponents(research),
    depth: assessDepth(research)
  };

  const complexity = calculateComplexity(factors);

  return {
    complexity, // 'simple' | 'moderate' | 'complex'
    needsModules: complexity === 'complex',
    factors,
    recommendation: getRecommendation(complexity, factors)
  };
}

/**
 * Estimate time required to master concept (in minutes)
 */
function estimateTimeRequired(research) {
  // Heuristic based on research length and depth indicators
  const wordCount = research.split(/\s+/).length;

  // Keywords indicating complexity
  const complexityMarkers = [
    'prerequisite', 'depends on', 'first understand', 'background',
    'multiple', 'various', 'several', 'different types'
  ];

  const markerCount = complexityMarkers.reduce((count, marker) => {
    return count + (research.toLowerCase().match(new RegExp(marker, 'g')) || []).length;
  }, 0);

  // Base time on word count and complexity markers
  const baseTime = Math.ceil(wordCount / 100) * 5; // ~5 min per 100 words
  const complexityTime = markerCount * 3; // +3 min per complexity marker

  return Math.min(baseTime + complexityTime, 120); // Cap at 2 hours
}

/**
 * Count prerequisite concepts mentioned
 */
function countPrerequisites(research) {
  const prereqPatterns = [
    /prerequisite[s]?:\s*([^.]+)/gi,
    /(?:must|should|need to) (?:first )?understand[:\s]+([^.]+)/gi,
    /requires (?:knowledge of|understanding)[:\s]+([^.]+)/gi,
    /background in[:\s]+([^.]+)/gi
  ];

  const prerequisites = new Set();

  prereqPatterns.forEach(pattern => {
    const matches = research.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/,|and/).map(s => s.trim());
      items.forEach(item => prerequisites.add(item));
    }
  });

  return prerequisites.size;
}

/**
 * Identify distinct subcomponents of the concept
 */
function identifySubcomponents(research) {
  const componentMarkers = [
    /types of[:\s]+([^.]+)/gi,
    /components?[:\s]+([^.]+)/gi,
    /parts?[:\s]+([^.]+)/gi,
    /aspects?[:\s]+([^.]+)/gi,
    /elements?[:\s]+([^.]+)/gi,
    /consists? of[:\s]+([^.]+)/gi
  ];

  const components = new Set();

  componentMarkers.forEach(pattern => {
    const matches = research.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/,|and/).map(s => s.trim());
      items.forEach(item => {
        if (item.length > 3 && item.length < 50) {
          components.add(item);
        }
      });
    }
  });

  return components.size;
}

/**
 * Assess conceptual depth
 */
function assessDepth(research) {
  // Count levels of explanation
  const levels = {
    definition: /definition|what is|means/gi.test(research),
    mechanism: /how it works|process|step[s]?/gi.test(research),
    theory: /theory|principle|law/gi.test(research),
    applications: /application|use[d]? (?:for|in)|example/gi.test(research),
    advanced: /advanced|complex|sophisticated|nuanced/gi.test(research)
  };

  return Object.values(levels).filter(Boolean).length;
}

/**
 * Calculate overall complexity score
 */
function calculateComplexity(factors) {
  let score = 0;

  // Time factor (>30 min = complex)
  if (factors.timeEstimate > 30) score += 2;
  else if (factors.timeEstimate > 15) score += 1;

  // Prerequisites factor
  if (factors.prerequisites > 3) score += 2;
  else if (factors.prerequisites > 1) score += 1;

  // Subcomponents factor
  if (factors.subcomponents > 4) score += 2;
  else if (factors.subcomponents > 2) score += 1;

  // Depth factor
  if (factors.depth >= 4) score += 2;
  else if (factors.depth >= 3) score += 1;

  // Classify
  if (score >= 5) return 'complex';
  if (score >= 3) return 'moderate';
  return 'simple';
}

/**
 * Get learning recommendation
 */
function getRecommendation(complexity, factors) {
  const recommendations = {
    simple: {
      modules: 1,
      approach: 'Single focused session',
      estimatedTime: `${factors.timeEstimate} minutes`
    },
    moderate: {
      modules: 1,
      approach: 'One session with careful progression through fields',
      estimatedTime: `${factors.timeEstimate} minutes`,
      note: 'Take breaks if needed'
    },
    complex: {
      modules: Math.ceil(factors.subcomponents / 2) || 2,
      approach: 'Break into focused modules, master each separately',
      estimatedTime: `${factors.timeEstimate} minutes total`,
      note: 'Each module will have fresh context for clarity'
    }
  };

  return recommendations[complexity];
}

/**
 * Suggest module breakdown for complex concepts
 */
export function suggestModules(concept, research, subcomponents) {
  if (subcomponents.size === 0) {
    return [{
      name: concept,
      description: 'Complete concept',
      order: 1
    }];
  }

  // Group related subcomponents
  const modules = Array.from(subcomponents).map((component, index) => ({
    name: `${concept}: ${component}`,
    description: `Understanding ${component} in the context of ${concept}`,
    order: index + 1
  }));

  // Limit to reasonable number of modules
  return modules.slice(0, 5);
}

/**
 * Validate module breakdown makes sense
 */
export function validateModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    return false;
  }

  // Check each module has required fields
  return modules.every(module =>
    module.name &&
    module.description &&
    typeof module.order === 'number'
  );
}
