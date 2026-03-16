// Challenge Library - All challenge definitions for Zen Math
// Each challenge defines a goal-oriented task within a specific mode
// Challenges progress from simple discovery to deeper mathematical understanding

const CHALLENGE_LIBRARY = [
    // =============================================================
    // BALANCE SCALE - Equality and comparison through weight
    // =============================================================
    {
        id: 'balance-001',
        mode: 'balance-scale',
        title: 'Perfect Balance',
        hint: 'Place stones until both sides rest in harmony',
        difficulty: 1,
        concepts: ['equality', 'balance'],
        goals: [
            { type: 'scale-balanced', tolerance: 0.1 }
        ]
    },
    {
        id: 'balance-002',
        mode: 'balance-scale',
        title: 'Use Every Stone',
        hint: 'Place all stones on the scale and find balance',
        difficulty: 2,
        concepts: ['equality', 'distribution'],
        goals: [
            { type: 'scale-balanced', tolerance: 0.1 },
            { type: 'all-stones-used' }
        ]
    },
    {
        id: 'balance-003',
        mode: 'balance-scale',
        title: 'Three and Three',
        hint: 'Place exactly three stones on each side',
        difficulty: 2,
        concepts: ['counting', 'equality', 'constraint'],
        goals: [
            { type: 'stone-count-per-side', left: 3, right: 3 },
            { type: 'scale-balanced', tolerance: 0.1 }
        ]
    },
    {
        id: 'balance-004',
        mode: 'balance-scale',
        title: 'One Heavy, Many Light',
        hint: 'Balance one heavy stone against several lighter ones',
        difficulty: 3,
        concepts: ['inequality', 'mass', 'multiplication'],
        goals: [
            { type: 'stone-count-per-side', left: 1, right: 3 },
            { type: 'scale-balanced', tolerance: 0.2 }
        ]
    },

    // =============================================================
    // MOBILE BALANCE - Recursive balance for algebra and substitution
    // =============================================================
    {
        id: 'mobile-001',
        mode: 'mobile-balance',
        title: 'Simple Balance',
        hint: 'Balance the top beam by placing equal weights on each side',
        difficulty: 1,
        concepts: ['equality', 'balance'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-002',
        mode: 'mobile-balance',
        title: 'Double the Weight',
        hint: 'One side has a 2, balance it with two 1s on the other',
        difficulty: 1,
        concepts: ['decomposition', 'equality'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-003',
        mode: 'mobile-balance',
        title: 'Three Ways to Three',
        hint: 'Make 3 using different combinations',
        difficulty: 2,
        concepts: ['decomposition', 'addition'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-004',
        mode: 'mobile-balance',
        title: 'Two-Level Mobile',
        hint: 'Balance the lower beam first, then use its total to balance the top',
        difficulty: 3,
        concepts: ['substitution', 'propagation'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-005',
        mode: 'mobile-balance',
        title: 'Heavy Bottom',
        hint: 'The lower beam holds weight - balance against it at the top',
        difficulty: 3,
        concepts: ['substitution', 'weight-propagation'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-006',
        mode: 'mobile-balance',
        title: 'Asymmetric Arms',
        hint: 'The fulcrum is not centered - distance matters',
        difficulty: 4,
        concepts: ['leverage', 'torque', 'ratios'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-007',
        mode: 'mobile-balance',
        title: 'Double Distance',
        hint: 'A stone at twice the distance needs half the weight',
        difficulty: 4,
        concepts: ['leverage', 'proportional-reasoning'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-008',
        mode: 'mobile-balance',
        title: 'Three Levels Deep',
        hint: 'Balance from bottom to top - each level builds on the last',
        difficulty: 5,
        concepts: ['substitution', 'systems', 'recursive-balance'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    },
    {
        id: 'mobile-009',
        mode: 'mobile-balance',
        title: 'Halving Tree',
        hint: 'Start with 16, split in half at each level down to 4s',
        difficulty: 5,
        concepts: ['division', 'repeated-halving', 'binary-tree'],
        goals: [
            { type: 'all-beams-balanced' },
            { type: 'total-mass', amount: 16 }
        ]
    },
    {
        id: 'mobile-010',
        mode: 'mobile-balance',
        title: 'The Grand Mobile',
        hint: 'Three levels, asymmetric arms - find the harmony',
        difficulty: 6,
        concepts: ['algebra', 'systems', 'complex-balance'],
        goals: [
            { type: 'all-beams-balanced' }
        ]
    }
];
