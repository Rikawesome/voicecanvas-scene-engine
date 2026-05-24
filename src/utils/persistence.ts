import { SceneState } from '../types/scene';

/**
 * Packs the live scene state data tree graph and prompts an automatic 
 * local .json file download through the browser.
 */
export function exportSceneState(state: SceneState): void {
  try {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create an invisible anchor tag link node to force download trigger
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.sceneId || 'manga-scene'}-${new Date().toISOString().slice(0,10)}.json`;
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up memory space buffers
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export scene tracking telemetry data:", error);
    alert("Could not export scene data.");
  }
}

/**
 * Reads an uploaded local JSON file asset from disk asynchronously 
 * and returns a clean, fully formed SceneState layout map.
 */
export function importSceneState(file: File): Promise<SceneState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const resultText = event.target?.result as string;
        const parsedState = JSON.parse(resultText) as SceneState;
        
        // Basic schema verification pass
        if (!parsedState.characters || !parsedState.camera) {
          throw new Error("Invalid scene structural formatting definitions.");
        }
        
        resolve(parsedState);
      } catch (error) {
        reject(new Error("File parse corruption or invalid Scene schema map."));
      }
    };
    
    reader.onerror = () => reject(new Error("Disk asset file read failure."));
    reader.readAsText(file);
  });
}