import React, { createContext, useContext, useState, ReactNode } from "react";

export interface MemoryItem {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  type: 'board-pack' | 'brief' | 'alert';
  actionItems?: string[];
  references?: string[] | { [num: string]: string };
}

interface BoardroomMemoryContextType {
  memory: MemoryItem[];
  setMemory: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
  pinnedId: number | null;
  setPinnedId: React.Dispatch<React.SetStateAction<number | null>>;
}

// Empty initial memory for production
const initialMemory: MemoryItem[] = [];

const BoardroomMemoryContext = createContext<BoardroomMemoryContextType | undefined>(undefined);

export function BoardroomMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<MemoryItem[]>(initialMemory);
  const [pinnedId, setPinnedId] = useState<number | null>(null);

  // Add logging wrapper for setMemory
  const wrappedSetMemory: React.Dispatch<React.SetStateAction<MemoryItem[]>> = (newState) => {
    console.log('BoardroomMemoryProvider: setMemory called with:', newState);
    if (typeof newState === 'function') {
      setMemory((prevState) => {
        const nextState = newState(prevState);
        console.log('BoardroomMemoryProvider: Memory state updated:', {
          previous: prevState,
          next: nextState
        });
        return nextState;
      });
    } else {
      console.log('BoardroomMemoryProvider: Memory state updated:', {
        previous: memory,
        next: newState
      });
      setMemory(newState);
    }
  };

  React.useEffect(() => {
    console.log('BoardroomMemoryProvider: initial memory state:', memory);
  }, []);

  return (
    <BoardroomMemoryContext.Provider value={{ memory, setMemory: wrappedSetMemory, pinnedId, setPinnedId }}>
      {children}
    </BoardroomMemoryContext.Provider>
  );
}

export function useBoardroomMemory() {
  const ctx = useContext(BoardroomMemoryContext);
  if (!ctx) {
    console.error('useBoardroomMemory must be used within a BoardroomMemoryProvider');
    throw new Error("useBoardroomMemory must be used within a BoardroomMemoryProvider");
  }
  console.log('useBoardroomMemory: Current context state:', ctx);
  return ctx;
} 