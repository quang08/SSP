'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Sparkles,
} from 'lucide-react';

// Slides data
const slides = [
  {
    id: 1,
    title: 'Welcome to SmartStudy+',
    description:
      'AI-powered learning platform that transforms your study materials',
    color: 'from-[var(--color-primary)] to-[var(--color-primary-gradient)]',
    icon: Brain,
  },
  {
    id: 2,
    title: 'Smart Content Organization',
    description:
      'Automatically structures content into logical chapters and sections based on your materials',
    color: 'from-blue-500 to-purple-500',
    icon: BookOpen,
  },
  {
    id: 3,
    title: 'Practice Section',
    description:
      'Chapter-specific practice tests to reinforce your understanding of individual concepts',
    color: 'from-purple-500 to-pink-500',
    icon: ClipboardCheck,
  },
  {
    id: 4,
    title: 'Test & Analytics',
    description:
      'Comprehensive mock tests and detailed analytics to track your progress',
    color: 'from-pink-500 to-red-500',
    icon: BarChart3,
  },
  {
    id: 5,
    title: 'Start Your Learning Journey',
    description:
      'Join SmartStudy+ today and revolutionize your study experience',
    color: 'from-[var(--color-primary)] to-[var(--color-primary-gradient)]',
    icon: Sparkles,
  },
];

export default function SlidesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isAutoPlaying) {
      timer = setTimeout(() => {
        setDirection(1);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [currentSlide, isAutoPlaying]);

  const goToNextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToPreviousSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <div className="absolute top-4 left-4 text-xl font-semibold text-[var(--color-text-secondary)]">
          {currentSlide + 1} / {slides.length}
        </div>

        <div className="w-full max-w-4xl aspect-video relative overflow-hidden rounded-xl shadow-2xl">
          <AnimatePresence custom={direction} initial={false} mode="wait">
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].color} p-12 flex flex-col items-center justify-center text-white`}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                {React.createElement(slides[currentSlide].icon, { size: 64 })}
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold mb-4 text-center"
              >
                {slides[currentSlide].title}
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-center max-w-2xl"
              >
                {slides[currentSlide].description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white text-[var(--color-text)] z-10 p-2"
            onClick={goToPreviousSlide}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white text-[var(--color-text)] z-10 p-2"
            onClick={goToNextSlide}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex space-x-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentSlide
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-gray-300)] hover:bg-[var(--color-gray-400)]'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-6 text-[var(--color-text-secondary)]"
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        >
          {isAutoPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
        </Button>
      </main>

      <footer className="py-6 text-center text-[var(--color-text-muted)] border-t border-[var(--color-gray-200)]">
        <p>© {new Date().getFullYear()} Smart Study+. All rights reserved.</p>
      </footer>
    </div>
  );
}
