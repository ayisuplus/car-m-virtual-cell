import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  AppState,
  CarDesign,
  SimParams,
  SimStatistics,
  SimulationState,
} from '@/types/simulation';

type Action =
  | { type: 'SET_SIMULATION_STATE'; payload: Partial<SimulationState> }
  | { type: 'SET_CAR_DESIGN'; payload: Partial<CarDesign> }
  | { type: 'SET_SIM_PARAMS'; payload: Partial<SimParams> }
  | { type: 'UPDATE_STATISTICS'; payload: SimStatistics }
  | { type: 'ADD_EXPERIMENT'; payload: { id: string; name: string } }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'RESET' };

const initialCarDesign: CarDesign = {
  signalingDomain: 'CD3ζ',
  targetAntigen: 'HER2',
  affinity: 7,
  checkpointBlockade: {
    CD47_SIRPa: true,
    CD24_Siglec10: false,
  },
};

const initialSimParams: SimParams = {
  carMCount: 12,
  wildTypeCount: 8,
  tumorCount: 25,
  cd8Count: 10,
  oxygenLevel: 0.5,
  lactateLevel: 0.3,
  tgfBetaLevel: 0.4,
  randomSeed: 20250706,
};

const initialState: AppState = {
  simulation: {
    isRunning: false,
    isPaused: false,
    speed: 1,
    stepCount: 0,
    simTime: 0,
    resetCounter: 0,
  },
  carDesign: initialCarDesign,
  simParams: initialSimParams,
  statistics: {
    time: [],
    tumorVolume: [],
    phagocytosisRate: [],
    m1Ratio: [],
    m2Ratio: [],
    cd8Infiltration: [],
    carMCount: [],
    tumorCount: [],
  },
  experiments: [],
  currentExperimentId: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SIMULATION_STATE':
      return { ...state, simulation: { ...state.simulation, ...action.payload } };
    case 'SET_CAR_DESIGN':
      return { ...state, carDesign: { ...state.carDesign, ...action.payload } };
    case 'SET_SIM_PARAMS':
      return { ...state, simParams: { ...state.simParams, ...action.payload } };
    case 'UPDATE_STATISTICS':
      return { ...state, statistics: action.payload };
    case 'SET_SPEED':
      return { ...state, simulation: { ...state.simulation, speed: action.payload } };
    case 'RESET':
      return {
        ...state,
        simulation: {
          ...state.simulation,
          isRunning: false,
          isPaused: false,
          stepCount: 0,
          simTime: 0,
          resetCounter: state.simulation.resetCounter + 1,
        },
        statistics: initialState.statistics,
      };
    default:
      return state;
  }
}

interface SimContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  startSim: () => void;
  pauseSim: () => void;
  resetSim: () => void;
  setSpeed: (speed: number) => void;
  updateCarDesign: (design: Partial<CarDesign>) => void;
  updateSimParams: (params: Partial<SimParams>) => void;
  onStatsUpdate: (stats: SimStatistics) => void;
}

const SimContext = createContext<SimContextType | null>(null);

export function SimProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startSim = useCallback(() => {
    dispatch({ type: 'SET_SIMULATION_STATE', payload: { isRunning: true, isPaused: false } });
  }, []);

  const pauseSim = useCallback(() => {
    dispatch({ type: 'SET_SIMULATION_STATE', payload: { isRunning: false, isPaused: true } });
  }, []);

  const resetSim = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    dispatch({ type: 'SET_SPEED', payload: speed });
  }, []);

  const updateCarDesign = useCallback((design: Partial<CarDesign>) => {
    dispatch({ type: 'SET_CAR_DESIGN', payload: design });
  }, []);

  const updateSimParams = useCallback((params: Partial<SimParams>) => {
    dispatch({ type: 'SET_SIM_PARAMS', payload: params });
  }, []);

  const onStatsUpdate = useCallback((stats: SimStatistics) => {
    dispatch({ type: 'UPDATE_STATISTICS', payload: stats });
  }, []);

  return (
    <SimContext.Provider
      value={{
        state,
        dispatch,
        startSim,
        pauseSim,
        resetSim,
        setSpeed,
        updateCarDesign,
        updateSimParams,
        onStatsUpdate,
      }}
    >
      {children}
    </SimContext.Provider>
  );
}

export function useSim() {
  const context = useContext(SimContext);
  if (!context) throw new Error('useSim must be used within SimProvider');
  return context;
}
