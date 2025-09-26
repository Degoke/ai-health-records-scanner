# AI Health Records Scanner 🔬

An intelligent web application that uses AI workers to analyze medical images and extract structured health information. The application can process medical records, radiology images, and convert extracted data into FHIR-compliant formats.

## Features

### 🖼️ Image Processing
- Upload medical images and documents
- Real-time image preview with canvas rendering
- Support for various image formats

### 🤖 AI-Powered Analysis
- **Record ID Scanning**: Extract text and structured data from medical documents
- **FHIR Processing**: Convert extracted content into FHIR-compliant JSON format
- **Radiology Analysis**: Detailed analysis of radiology images with findings and observations

### 📊 Multi-Tab Results Interface
- **Extracted Tab**: Raw extracted content from images
- **FHIR Tab**: Structured FHIR JSON with markdown rendering
- **Radiology Tab**: Radiology analysis results with markdown formatting
- **Tools Tab**: Interactive tool call interface for AI worker interactions

### 🔧 Advanced Features
- Interactive tool call handling for complex AI workflows
- Real-time status updates during processing
- Editable content areas for manual corrections
- FHIR server integration for data persistence
- Markdown rendering for better readability

## Technology Stack

- **Frontend**: Vanilla JavaScript with ES6 modules
- **Build Tool**: Vite
- **Styling**: Custom CSS with modern UI design
- **AI Integration**: ByteEngine API with specialized workers
- **Data Format**: FHIR (Fast Healthcare Interoperability Resources)
- **Markdown**: Marked.js for content rendering

## Project Structure

```
src/
├── main.js              # Main application logic and UI interactions
├── config.js            # API configuration and worker IDs
├── style.css            # Application styling
├── services/
│   ├── fhir.js          # FHIR processing and server integration
│   ├── radiology.js     # Radiology image analysis
│   └── toolUi.js        # Tool call interface management
└── utils/
    ├── dom.js           # DOM manipulation utilities
    ├── json.js          # JSON parsing and processing
    └── time.js          # Time-related utilities
```

## Setup and Installation

### Prerequisites
- Node.js 20 or higher
- npm or yarn package manager
- ByteEngine account and API access

### ByteEngine Setup

This application uses ByteEngine's AI workers and FHIR server infrastructure. Follow these steps to get started:

#### 1. Create ByteEngine Account
1. Visit [ByteEngine](https://byteengine.com) and sign up for an account
2. Complete the account verification process
3. Access your dashboard

#### 2. Get API Key
1. In your ByteEngine dashboard, navigate to **API Keys** section
2. Click **"Create New API Key"**
3. Give it a descriptive name (e.g., "AI Health Records Scanner")
4. Copy the generated API key - you'll need this for the `.env` file

#### 3. Create FHIR Server
1. In your ByteEngine dashboard, go to **FHIR Servers**
2. Click **"Create New FHIR Server"**
3. Configure your FHIR server settings:
   - **Name**: "Health Records FHIR Server"
   - **Version**: FHIR R4 (recommended)
   - **Base URL**: This will be auto-generated
4. Copy the **Base URL** - you'll need this for the `.env` file
5. Copy the **API Key** for the FHIR server

#### 4. Create AI Workers

You'll need to create three specialized AI workers:

##### Record Scanning Worker
1. Go to **Workers** in your dashboard
2. Click **"Create New Worker"**
3. Configure the worker:
   - **Name**: "Medical Record Scanner"
   - **System Instruction**: 
     ```
     You are a medical document analysis specialist. Your task is to extract text content and structured data from medical images and documents. Focus on identifying:
     - Patient information
     - Medical record numbers
     - Clinical notes
     - Diagnoses
     - Medications
     - Vital signs
     - Any other relevant medical data
     
     Provide clear, structured output that can be easily processed by downstream systems.
     ```
   - **Functions**: Enable text extraction and data parsing capabilities
4. Copy the **Worker ID** after creation

##### FHIR Processing Worker
1. Create another worker for FHIR conversion:
   - **Name**: "FHIR Data Processor"
   - **System Instruction**:
     ```
     You are a FHIR data specialist. Convert extracted medical text into FHIR-compliant JSON resources. Focus on creating:
     - DocumentReference resources for medical documents
     - Patient resources for patient information
     - Observation resources for clinical data
     - Condition resources for diagnoses
     - MedicationStatement resources for medications
     
     Ensure all output follows FHIR R4 specifications and includes proper resource references.
     ```
   - **Functions**: Enable JSON generation and FHIR resource creation
5. Copy the **Worker ID**

##### Radiology Analysis Worker
1. Create a third worker for radiology analysis:
   - **Name**: "Radiology Image Analyzer"
   - **System Instruction**:
     ```
     You are a radiology specialist. Analyze medical images (X-rays, CT scans, MRIs, etc.) and provide detailed findings including:
     - Anatomical structures visible
     - Abnormalities or pathologies
     - Technical quality assessment
     - Clinical significance
     - Recommendations for follow-up
     
     Provide clear, professional radiology reports in markdown format.
     ```
   - **Functions**: Enable image analysis and report generation
6. Copy the **Worker ID**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-healthrecords-scanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   VITE_BYTEENGINE_API_KEY=your_byteengine_api_key_here
   VITE_FHIR_SERVER_BASE_URL=your_fhir_server_base_url_here
   ```

4. **Configure Worker IDs**
   Update the worker IDs in `src/config.js` with the IDs you copied from ByteEngine:
   ```javascript
   export const WORKER_ID = 'your-record-scanning-worker-id';
   export const FHIR_WORKER_ID = 'your-fhir-worker-id';
   export const RADIOLOGY_WORKER_ID = 'your-radiology-worker-id';
   ```

### Customizing Workers

You can modify the system instructions and functions for each worker to better suit your specific needs:

1. **Access Worker Settings**: Go to your ByteEngine dashboard → Workers
2. **Edit Worker**: Click on the worker you want to modify
3. **Update System Instruction**: Modify the prompt to change how the AI behaves
4. **Adjust Functions**: Enable/disable specific capabilities
5. **Save Changes**: The updated worker will be available immediately

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Basic Workflow

1. **Upload Image**: Select a medical image or document using the file input
2. **Scan Record ID**: Click "Scan Record ID" to extract text and structured data
3. **Process with FHIR**: Use the "Process with FHIR Worker" button to convert to FHIR format
4. **Radiology Analysis**: Click "Radiology Explain" for detailed image analysis
5. **Review Results**: Navigate between tabs to view different processing results

### Advanced Features

- **Tool Interactions**: When AI workers require additional input, use the Tools tab to provide responses
- **Manual Editing**: Edit extracted content and FHIR JSON before saving
- **FHIR Server Integration**: Save processed FHIR data directly to a FHIR server

## API Integration

The application integrates with ByteEngine's cloud infrastructure, which provides:

### ByteEngine Services Used
- **AI Workers**: Specialized AI models for different medical analysis tasks
- **FHIR Server**: Cloud-hosted FHIR-compliant data storage and retrieval
- **API Gateway**: Secure access to all ByteEngine services

### Worker Integration
- **Record Scanning Worker**: Extracts text and structured data from medical documents using OCR and NLP
- **FHIR Worker**: Converts extracted content into FHIR-compliant JSON resources
- **Radiology Worker**: Analyzes radiology images using computer vision and medical AI

### FHIR Server Integration
- **Data Persistence**: Save processed FHIR resources to your ByteEngine FHIR server
- **Resource Management**: Create, read, update, and delete FHIR resources
- **Compliance**: Full FHIR R4 specification compliance
- **Security**: Secure API access with authentication tokens

## FHIR Compliance

The application generates FHIR-compliant resources including:
- DocumentReference resources for medical documents
- Structured data extraction and formatting
- Integration with FHIR servers for data persistence

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Note**: This application requires valid API keys and worker IDs to function properly. Ensure all environment variables are configured before running the application.
