import { 
  Dumbbell, BookOpen, Monitor, Coffee, Moon, Sun, 
  Briefcase, Heart, Activity, Code, PenTool, Music, 
  Utensils, Wallet, ShoppingCart, Target, Plane, 
  Users, Smartphone, ListTodo, Brain, Zap, Droplet
} from 'lucide-react';

/**
 * AI-powered utility to automatically match a string (like a habit name or task title)
 * to a relevant Lucide icon.
 */
export function getIconForString(text: string) {
  const lower = text.toLowerCase();
  
  // Fitness & Health
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('lift') || lower.includes('fitness') || lower.includes('run') || lower.includes('exercise')) return Dumbbell;
  if (lower.includes('health') || lower.includes('meditate') || lower.includes('yoga') || lower.includes('stretch')) return Activity;
  if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrate')) return Droplet;
  if (lower.includes('heart') || lower.includes('love') || lower.includes('care')) return Heart;
  
  // Learning & Study
  if (lower.includes('study') || lower.includes('read') || lower.includes('book') || lower.includes('learn') || lower.includes('course')) return BookOpen;
  if (lower.includes('brain') || lower.includes('think') || lower.includes('reflect') || lower.includes('journal')) return Brain;
  
  // Work & Productivity
  if (lower.includes('code') || lower.includes('dev') || lower.includes('program') || lower.includes('build') || lower.includes('hack')) return Code;
  if (lower.includes('work') || lower.includes('office') || lower.includes('meeting') || lower.includes('client') || lower.includes('sync') || lower.includes('standup')) return Briefcase;
  if (lower.includes('computer') || lower.includes('screen') || lower.includes('email') || lower.includes('inbox')) return Monitor;
  if (lower.includes('plan') || lower.includes('task') || lower.includes('todo') || lower.includes('organize')) return ListTodo;
  
  // Daily Routines & Rest
  if (lower.includes('coffee') || lower.includes('break') || lower.includes('rest')) return Coffee;
  if (lower.includes('eat') || lower.includes('food') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('meal') || lower.includes('breakfast')) return Utensils;
  if (lower.includes('sleep') || lower.includes('bed') || lower.includes('night') || lower.includes('evening') || lower.includes('wind down')) return Moon;
  if (lower.includes('wake') || lower.includes('morning') || lower.includes('rise')) return Sun;
  
  // Finance & Commerce
  if (lower.includes('money') || lower.includes('finance') || lower.includes('budget') || lower.includes('pay') || lower.includes('bill')) return Wallet;
  if (lower.includes('shop') || lower.includes('buy') || lower.includes('grocer') || lower.includes('store')) return ShoppingCart;
  
  // Misc
  if (lower.includes('travel') || lower.includes('fly') || lower.includes('trip') || lower.includes('drive') || lower.includes('commute')) return Plane;
  if (lower.includes('music') || lower.includes('listen') || lower.includes('podcast') || lower.includes('guitar')) return Music;
  if (lower.includes('phone') || lower.includes('call') || lower.includes('social') || lower.includes('app')) return Smartphone;
  if (lower.includes('write') || lower.includes('draw') || lower.includes('design') || lower.includes('art')) return PenTool;
  if (lower.includes('friend') || lower.includes('family') || lower.includes('people') || lower.includes('meet')) return Users;
  if (lower.includes('energy') || lower.includes('focus')) return Zap;
  
  return Target; // default fallback
}
