const fs = require('fs');
const path = require('path');

const rootPath = 'D:/codesage';
const outputFile = 'D:/codesage-full-dump.txt';

const includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.prisma', '.json', '.md'];
const excludeFolders = ['node_modules', '.git', 'dist', 'build', '.next'];

let output = '';

function shouldExclude(filePath) {
    return excludeFolders.some(folder => filePath.includes(`\\${folder}\\`));
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        if (shouldExclude(filePath)) return;
        
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else {
            const ext = path.extname(file);
            if (includeExtensions.includes(ext)) {
                const relativePath = filePath.replace(rootPath, '').replace(/\\/g, '/');
                output += '\n\n=========================================\n';
                output += `FILE: ${relativePath}\n`;
                output += '=========================================\n';
                output += fs.readFileSync(filePath, 'utf8');
            }
        }
    });
}

walkDir(rootPath);
fs.writeFileSync(outputFile, output);
console.log('Done! Check:', outputFile);