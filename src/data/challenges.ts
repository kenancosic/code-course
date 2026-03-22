export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'javascript' | 'python';

export interface TestCase {
  input: string;
  expected_output: string;
  isHidden?: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xp_reward: number;
  language: Language;
  starter_code: string;
  solution_code?: string;
  test_cases: TestCase[];
  examples: Example[];
  hints: string[];
  constraints?: string[];
  tags?: string[];
}

export const challenges: Challenge[] = [
  {
    id: 'two-sum',
    title: 'The Two Sum Incantation',
    description: `Given an array of integers \\"nums\\" and an integer \\"target\\", return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    difficulty: 'easy',
    xp_reward: 100,
    language: 'javascript',
    starter_code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your code here
  
}`,
    solution_code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    test_cases: [
      { input: '[2,7,11,15], 9', expected_output: '[0,1]', isHidden: false },
      { input: '[3,2,4], 6', expected_output: '[1,2]', isHidden: false },
      { input: '[3,3], 6', expected_output: '[0,1]', isHidden: true },
      { input: '[1,5,3,7,9], 12', expected_output: '[1,3]', isHidden: true },
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      }
    ],
    hints: [
      'A brute force approach would check every pair of numbers. Can you do better?',
      'Consider using a hash map to store numbers you have seen and their indices.',
      'For each number, check if its complement (target - current) exists in the map.'
    ],
    constraints: [
      '2 <= nums.length <= 104',
      '-109 <= nums[i] <= 109',
      '-109 <= target <= 109',
      'Only one valid answer exists.'
    ],
    tags: ['array', 'hash-table']
  },
  {
    id: 'reverse-string',
    title: 'The Reversal Charm',
    description: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.`,
    difficulty: 'easy',
    xp_reward: 75,
    language: 'javascript',
    starter_code: `/**
 * @param {character[]} s
 * @return {void} Do not return anything, modify s in-place instead.
 */
function reverseString(s) {
  // Your code here
  
}`,
    test_cases: [
      { input: '["h","e","l","l","o"]', expected_output: '["o","l","l","e","h"]', isHidden: false },
      { input: '["H","a","n","n","a","h"]', expected_output: '["h","a","n","n","a","H"]', isHidden: false },
      { input: '["a"]', expected_output: '["a"]', isHidden: true },
      { input: '["a","b","c","d"]', expected_output: '["d","c","b","a"]', isHidden: true },
    ],
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
        explanation: 'The string is reversed in-place.'
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
        explanation: 'The string is reversed in-place.'
      }
    ],
    hints: [
      'Think about swapping elements from opposite ends of the array.',
      'Use two pointers: one at the start, one at the end.',
      'Swap elements and move pointers toward the center until they meet.'
    ],
    constraints: [
      '1 <= s.length <= 105',
      's[i] is a printable ascii character.'
    ],
    tags: ['two-pointers', 'string']
  },
  {
    id: 'valid-parentheses',
    title: 'The Balanced Runes',
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    difficulty: 'medium',
    xp_reward: 150,
    language: 'javascript',
    starter_code: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Your code here
  
}`,
    test_cases: [
      { input: '"()"', expected_output: 'true', isHidden: false },
      { input: '"()[]{}"', expected_output: 'true', isHidden: false },
      { input: '"(]"', expected_output: 'false', isHidden: false },
      { input: '"([)]"', expected_output: 'false', isHidden: true },
      { input: '"{[]}"', expected_output: 'true', isHidden: true },
      { input: '"((()))"', expected_output: 'true', isHidden: true },
    ],
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'Simple valid parentheses.'
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'Multiple types of valid brackets.'
      },
      {
        input: 's = "(]"',
        output: 'false',
        explanation: 'Mismatched bracket types.'
      }
    ],
    hints: [
      'Consider using a stack data structure.',
      'Push opening brackets onto the stack.',
      'When you encounter a closing bracket, check if it matches the top of the stack.'
    ],
    constraints: [
      '1 <= s.length <= 104',
      's consists of parentheses only: "()[]{}".'
    ],
    tags: ['stack', 'string']
  },
  {
    id: 'fibonacci',
    title: 'The Recursive Labyrinth',
    description: `The Fibonacci numbers, commonly denoted F(n) form a sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1.

That is:
F(0) = 0, F(1) = 1
F(n) = F(n - 1) + F(n - 2), for n > 1.

Given n, calculate F(n).`,
    difficulty: 'easy',
    xp_reward: 100,
    language: 'javascript',
    starter_code: `/**
 * @param {number} n
 * @return {number}
 */
function fib(n) {
  // Your code here
  
}`,
    test_cases: [
      { input: '2', expected_output: '1', isHidden: false },
      { input: '3', expected_output: '2', isHidden: false },
      { input: '4', expected_output: '3', isHidden: false },
      { input: '10', expected_output: '55', isHidden: true },
      { input: '20', expected_output: '6765', isHidden: true },
    ],
    examples: [
      {
        input: 'n = 2',
        output: '1',
        explanation: 'F(2) = F(1) + F(0) = 1 + 0 = 1.'
      },
      {
        input: 'n = 3',
        output: '2',
        explanation: 'F(3) = F(2) + F(1) = 1 + 1 = 2.'
      },
      {
        input: 'n = 4',
        output: '3',
        explanation: 'F(4) = F(3) + F(2) = 2 + 1 = 3.'
      }
    ],
    hints: [
      'Start with the base cases: F(0) = 0 and F(1) = 1.',
      'For the recursive case, return fib(n-1) + fib(n-2).',
      'Consider using memoization to optimize for larger values of n.'
    ],
    constraints: [
      '0 <= n <= 30'
    ],
    tags: ['recursion', 'math', 'dynamic-programming']
  },
  {
    id: 'merge-intervals',
    title: 'The Merging Ritual',
    description: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

You may return the answer in any order.`,
    difficulty: 'medium',
    xp_reward: 200,
    language: 'javascript',
    starter_code: `/**
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
  // Your code here
  
}`,
    test_cases: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', expected_output: '[[1,6],[8,10],[15,18]]', isHidden: false },
      { input: '[[1,4],[4,5]]', expected_output: '[[1,5]]', isHidden: false },
      { input: '[[1,4],[0,4]]', expected_output: '[[0,4]]', isHidden: true },
      { input: '[[1,4],[2,3]]', expected_output: '[[1,4]]', isHidden: true },
      { input: '[[1,3],[2,6],[8,10],[15,18],[17,20]]', expected_output: '[[1,6],[8,10],[15,20]]', isHidden: true },
    ],
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        output: '[[1,6],[8,10],[15,18]]',
        explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].'
      },
      {
        input: 'intervals = [[1,4],[4,5]]',
        output: '[[1,5]]',
        explanation: 'Intervals [1,4] and [4,5] are considered overlapping.'
      }
    ],
    hints: [
      'Sort the intervals by their start time first.',
      'Keep track of the current interval being merged.',
      'If the next interval overlaps with current, merge them. Otherwise, add current to result.'
    ],
    constraints: [
      '1 <= intervals.length <= 104',
      'intervals[i].length == 2',
      '0 <= starti <= endi <= 104'
    ],
    tags: ['array', 'sorting']
  }
];

export const getChallengeById = (id: string): Challenge | undefined => {
  return challenges.find(c => c.id === id);
};

export const getChallengesByDifficulty = (difficulty: Difficulty): Challenge[] => {
  return challenges.filter(c => c.difficulty === difficulty);
};

export const getChallengesByLanguage = (language: Language): Challenge[] => {
  return challenges.filter(c => c.language === language);
};

export const getCompletedChallengeIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('completedChallenges') || '[]');
};

export const markChallengeComplete = (challengeId: string): void => {
  if (typeof window === 'undefined') return;
  const completed = getCompletedChallengeIds();
  if (!completed.includes(challengeId)) {
    completed.push(challengeId);
    localStorage.setItem('completedChallenges', JSON.stringify(completed));
  }
};

export const getChallengeProgress = (): { completed: number; total: number } => {
  return {
    completed: getCompletedChallengeIds().length,
    total: challenges.length
  };
};
