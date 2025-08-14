const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Input and output paths
const inputVideo = path.join(__dirname, 'assets', 'Video Project 1.mp4');
const outputVideo = path.join(__dirname, 'assets', 'Video-Project-1-compressed.mp4');

// Check if input file exists
if (!fs.existsSync(inputVideo)) {
    console.error('❌ Input video not found:', inputVideo);
    process.exit(1);
}

// Get original file size
const originalSize = fs.statSync(inputVideo).size / (1024 * 1024);
console.log(`📹 Original video size: ${originalSize.toFixed(2)} MB`);
console.log('🔄 Starting compression...');

// Compress video
ffmpeg(inputVideo)
    .outputOptions([
        '-c:v libx264',        // Use H.264 codec
        '-preset medium',       // Balance between speed and compression
        '-crf 28',             // Quality (higher = lower quality, more compression)
        '-vf scale=1280:-2',   // Scale to 1280px width, maintain aspect ratio
        '-c:a aac',            // Audio codec
        '-b:a 128k',           // Audio bitrate
        '-movflags +faststart' // Optimize for web streaming
    ])
    .output(outputVideo)
    .on('progress', (progress) => {
        process.stdout.write(`\r⏳ Progress: ${Math.round(progress.percent || 0)}%`);
    })
    .on('end', () => {
        const compressedSize = fs.statSync(outputVideo).size / (1024 * 1024);
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        console.log('\n✅ Compression complete!');
        console.log(`📊 Compressed size: ${compressedSize.toFixed(2)} MB`);
        console.log(`💾 Size reduction: ${reduction}%`);
        console.log(`📁 Output saved to: ${outputVideo}`);
        
        if (compressedSize > 20) {
            console.log('⚠️  Warning: File is still larger than 20MB. You may need more aggressive compression.');
            console.log('💡 Try running with higher CRF value (e.g., 32) for more compression.');
        } else {
            console.log('✨ File is under 20MB - ready for Shopify!');
        }
    })
    .on('error', (err) => {
        console.error('\n❌ Compression failed:', err.message);
        process.exit(1);
    })
    .run();