class PCMProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        
        if (input && input.length > 0) {
            const inputChannel = input[0];
            const length = inputChannel.length;
            const int16Array = new Int16Array(length);
            let sum = 0;

            for (let i = 0; i < length; i++) {
                // Clamp the value to the [-1, 1] range
                const s = Math.max(-1, Math.min(1, inputChannel[i]));
                // Convert to 16-bit PCM
                int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                // Calculate absolute sum for volume
                sum += Math.abs(inputChannel[i]);
            }

            const volume = sum / length;
            
            // Send the converted buffer and volume back to the main thread.
            // We transfer the buffer to avoid copying.
            this.port.postMessage({
                buffer: int16Array.buffer,
                volume: volume
            }, [int16Array.buffer]);
        }
        
        // Return true to keep the processor alive
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
