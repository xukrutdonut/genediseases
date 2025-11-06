const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PDFOCRProcessor {
    constructor(pdfPath, outputDir) {
        this.pdfPath = pdfPath;
        this.outputDir = outputDir || path.join(__dirname, '..', 'data', 'pdf_extracted');
        this.textOutputPath = path.join(this.outputDir, 'oxford_genetics_text.txt');
        this.jsonOutputPath = path.join(this.outputDir, 'oxford_genetics_data.json');
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Extract text from PDF using pdftotext (faster, better quality)
     */
    async extractTextDirect() {
        console.log('Extracting text directly from PDF...');
        try {
            const command = `pdftotext -layout "${this.pdfPath}" "${this.textOutputPath}"`;
            await execAsync(command);
            console.log(`✓ Text extracted to: ${this.textOutputPath}`);
            return true;
        } catch (error) {
            console.error('Error extracting text directly:', error.message);
            return false;
        }
    }

    /**
     * Get PDF information (page count, etc.)
     */
    async getPDFInfo() {
        try {
            const { stdout } = await execAsync(`pdfinfo "${this.pdfPath}"`);
            const pageMatch = stdout.match(/Pages:\s+(\d+)/);
            const pages = pageMatch ? parseInt(pageMatch[1]) : 0;
            console.log(`PDF has ${pages} pages`);
            return { pages };
        } catch (error) {
            console.error('Error getting PDF info:', error.message);
            return { pages: 0 };
        }
    }

    /**
     * Extract text using OCR (for scanned PDFs or images)
     * This will process pages in batches to avoid memory issues
     */
    async extractTextOCR(startPage = 1, endPage = null, batchSize = 10) {
        console.log('Starting OCR extraction...');
        
        const info = await this.getPDFInfo();
        const totalPages = endPage || info.pages;
        
        let allText = '';
        let currentPage = startPage;
        
        while (currentPage <= totalPages) {
            const batchEnd = Math.min(currentPage + batchSize - 1, totalPages);
            console.log(`Processing pages ${currentPage}-${batchEnd} of ${totalPages}...`);
            
            try {
                // Convert PDF pages to images
                const imgDir = path.join(this.outputDir, 'temp_images');
                if (!fs.existsSync(imgDir)) {
                    fs.mkdirSync(imgDir, { recursive: true });
                }
                
                const convertCmd = `pdftoppm -f ${currentPage} -l ${batchEnd} -png "${this.pdfPath}" "${imgDir}/page"`;
                await execAsync(convertCmd);
                
                // Run OCR on each image
                const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.png')).sort();
                
                for (const file of files) {
                    const imgPath = path.join(imgDir, file);
                    const txtPath = path.join(imgDir, file.replace('.png', ''));
                    
                    try {
                        await execAsync(`tesseract "${imgPath}" "${txtPath}" -l eng`);
                        const text = fs.readFileSync(txtPath + '.txt', 'utf8');
                        allText += `\n\n--- Page ${currentPage} ---\n\n${text}`;
                        currentPage++;
                    } catch (err) {
                        console.error(`Error processing ${file}:`, err.message);
                        currentPage++;
                    }
                }
                
                // Clean up temp images
                fs.readdirSync(imgDir).forEach(f => {
                    fs.unlinkSync(path.join(imgDir, f));
                });
                
            } catch (error) {
                console.error(`Error in batch ${currentPage}-${batchEnd}:`, error.message);
                break;
            }
        }
        
        // Save extracted text
        fs.writeFileSync(this.textOutputPath, allText);
        console.log(`✓ OCR text saved to: ${this.textOutputPath}`);
        
        return allText;
    }

    /**
     * Parse extracted text and structure it
     */
    async parseAndStructureText() {
        console.log('Parsing and structuring text...');
        
        if (!fs.existsSync(this.textOutputPath)) {
            console.error('Text file not found. Run extraction first.');
            return null;
        }
        
        const text = fs.readFileSync(this.textOutputPath, 'utf8');
        
        // Split into sections based on common patterns
        const sections = [];
        const lines = text.split('\n');
        
        let currentSection = {
            title: 'Introduction',
            content: '',
            page: 1
        };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detect page markers
            if (line.match(/^---\s*Page\s+(\d+)\s*---$/)) {
                const pageNum = parseInt(line.match(/\d+/)[0]);
                currentSection.page = pageNum;
                continue;
            }
            
            // Detect section headers (usually all caps or numbered)
            if (line.match(/^[A-Z\s]{10,}$/) || 
                line.match(/^\d+\.\d*\s+[A-Z]/) ||
                line.match(/^Chapter\s+\d+/i)) {
                
                if (currentSection.content.trim()) {
                    sections.push({ ...currentSection });
                }
                
                currentSection = {
                    title: line,
                    content: '',
                    page: currentSection.page
                };
            } else {
                currentSection.content += line + '\n';
            }
        }
        
        // Add last section
        if (currentSection.content.trim()) {
            sections.push(currentSection);
        }
        
        const structuredData = {
            source: 'Oxford Desk Reference: Clinical Genetics and Genomics',
            extractedAt: new Date().toISOString(),
            totalSections: sections.length,
            sections: sections
        };
        
        fs.writeFileSync(this.jsonOutputPath, JSON.stringify(structuredData, null, 2));
        console.log(`✓ Structured data saved to: ${this.jsonOutputPath}`);
        
        return structuredData;
    }

    /**
     * Main processing function
     */
    async process(useOCR = false) {
        console.log('='.repeat(60));
        console.log('PDF OCR Processor');
        console.log('='.repeat(60));
        console.log(`PDF: ${this.pdfPath}`);
        console.log(`Output: ${this.outputDir}`);
        console.log('='.repeat(60));
        
        // First try direct text extraction (much faster and better quality)
        const directSuccess = await this.extractTextDirect();
        
        // If direct extraction fails or useOCR is forced, use OCR
        if (!directSuccess || useOCR) {
            console.log('Falling back to OCR extraction...');
            await this.extractTextOCR();
        }
        
        // Parse and structure the extracted text
        const structuredData = await this.parseAndStructureText();
        
        console.log('='.repeat(60));
        console.log('Processing complete!');
        console.log(`Text file: ${this.textOutputPath}`);
        console.log(`JSON file: ${this.jsonOutputPath}`);
        console.log(`Sections extracted: ${structuredData?.totalSections || 0}`);
        console.log('='.repeat(60));
        
        return structuredData;
    }
}

// Run if called directly
if (require.main === module) {
    const pdfPath = process.argv[2] || path.join(__dirname, '..', 'data', 'Oxford_Clinical_Genetics.pdf');
    const useOCR = process.argv.includes('--ocr');
    
    const processor = new PDFOCRProcessor(pdfPath);
    processor.process(useOCR)
        .then(() => {
            console.log('✓ All done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = PDFOCRProcessor;
