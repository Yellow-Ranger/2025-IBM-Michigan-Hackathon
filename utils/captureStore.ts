import { create } from 'zustand';

export type CaptureStep =
  | 'initial'
  | 'horizontal-rotation'
  | 'ceiling-capture'
  | 'floor-capture'
  | 'second-position-prompt'
  | 'second-rotation'
  | 'uploading'
  | 'processing'
  | 'complete';

export interface CapturedImage {
  blob: any; // Will be file path in React Native
  timestamp: number;
  heading: number | null;
  pitch: number | null;
  position: 1 | 2;
}

interface CaptureState {
  step: CaptureStep;
  currentPosition: 1 | 2;

  // Coverage tracking
  coveredSegments: Set<number>;
  ceilingSegments: Set<number>;
  floorSegments: Set<number>;
  hasCeilingCoverage: boolean;
  hasFloorCoverage: boolean;

  // Captured data
  images: CapturedImage[];

  // Actions
  setStep: (step: CaptureStep) => void;
  setPosition: (position: 1 | 2) => void;
  markSegmentCovered: (segment: number) => void;
  markCeilingSegmentCovered: (segment: number) => void;
  markFloorSegmentCovered: (segment: number) => void;
  setCeilingCoverage: (covered: boolean) => void;
  setFloorCoverage: (covered: boolean) => void;
  addImage: (image: CapturedImage) => void;
  reset: () => void;

  // Computed
  getCoveragePercentage: () => number;
  getCeilingCoveragePercentage: () => number;
  getFloorCoveragePercentage: () => number;
  canProceedToVertical: () => boolean;
  canProceedToFloor: () => boolean;
  canFinishPosition: () => boolean;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  step: 'initial',
  currentPosition: 1,
  coveredSegments: new Set(),
  ceilingSegments: new Set(),
  floorSegments: new Set(),
  hasCeilingCoverage: false,
  hasFloorCoverage: false,
  images: [],

  setStep: (step) => set({ step }),

  setPosition: (position) => set({
    currentPosition: position,
    coveredSegments: new Set(),
    ceilingSegments: new Set(),
    floorSegments: new Set(),
    hasCeilingCoverage: false,
    hasFloorCoverage: false,
  }),

  markSegmentCovered: (segment) => set((state) => {
    const newSegments = new Set(state.coveredSegments);
    newSegments.add(segment);
    return { coveredSegments: newSegments };
  }),

  markCeilingSegmentCovered: (segment) => set((state) => {
    const newSegments = new Set(state.ceilingSegments);
    newSegments.add(segment);
    return { ceilingSegments: newSegments };
  }),

  markFloorSegmentCovered: (segment) => set((state) => {
    const newSegments = new Set(state.floorSegments);
    newSegments.add(segment);
    return { floorSegments: newSegments };
  }),

  setCeilingCoverage: (covered) => set({ hasCeilingCoverage: covered }),
  setFloorCoverage: (covered) => set({ hasFloorCoverage: covered }),

  addImage: (image) => set((state) => ({
    images: [...state.images, image],
  })),

  reset: () => set({
    step: 'initial',
    currentPosition: 1,
    coveredSegments: new Set(),
    ceilingSegments: new Set(),
    floorSegments: new Set(),
    hasCeilingCoverage: false,
    hasFloorCoverage: false,
    images: [],
  }),

  getCoveragePercentage: () => {
    const state = get();
    return (state.coveredSegments.size / 24) * 100;
  },

  getCeilingCoveragePercentage: () => {
    const state = get();
    return (state.ceilingSegments.size / 8) * 100;
  },

  getFloorCoveragePercentage: () => {
    const state = get();
    return (state.floorSegments.size / 8) * 100;
  },

  canProceedToVertical: () => {
    const state = get();
    return state.coveredSegments.size >= 12;
  },

  canProceedToFloor: () => {
    const state = get();
    return state.ceilingSegments.size >= 4;
  },

  canFinishPosition: () => {
    const state = get();
    return state.ceilingSegments.size >= 4 && state.floorSegments.size >= 4;
  },
}));
