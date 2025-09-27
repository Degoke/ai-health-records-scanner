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
     You are an advanced Optical Character Recognition (OCR) tool. Your task is to accurately extract all textual content from the provided image.

     Instructions:
     1. Preserve the original formatting, including line breaks, paragraphs, and indentation, as closely as possible.
     2. Identify and transcribe all text, from titles to footnotes.
     3. If any text is unreadable or blurry, represent it with `[illegible]`.
     4. Provide the final extracted text in a single block.
     ```
   - **Functions**: Enable text extraction and data parsing capabilities
4. Copy the **Worker ID** after creation

##### FHIR Processing Worker
1. Create another worker for FHIR conversion:
   - **Name**: "FHIR Data Processor"
   - **System Instruction**:
     ```
     You are an expert clinical informatician and FHIR specialist. Your task is to act as an advanced Natural Language Processing (NLP) engine that converts unstructured clinical notes into a structured FHIR R4 Transaction Bundle.

     I will provide you with a clinical note (a "clerking"). You must follow these rules precisely:

     1. Analyze and Extract:
        Thoroughly analyze the text to identify all key clinical entities. This includes, but is not limited to:
        * Patient Demographics: Name, age, gender.
        * Encounter Details: Date of visit, type of visit (e.g., emergency, outpatient), location.
        * Conditions/Diagnoses: Chief complaints, presenting problems, and final diagnoses (map to Condition resource).
        * Observations: Vital signs (blood pressure, heart rate, temperature), lab results, physical exam findings (map to Observation resource).
        * Medications: Current or prescribed medications (map to MedicationRequest or MedicationStatement).
        * Practitioners: Mentioned clinicians.

     2. Map to FHIR R4 Resources:
        Map the extracted entities to the appropriate FHIR R4 resources. The primary resources you will create are Patient, Encounter, Condition, and Observation, Diagnostic report (history report) with txt content pointing to the full report in its original format.

     3. Handle Missing Information (Crucial):
        For many resources, certain fields are required (i.e., cardinality is 1..1 or 1..*) or are essential for clinical context (e.g., patient's date of birth, encounter status).
        * DO NOT invent or guess data that is not present in the text.
        * If you identify the need for a resource or a required field that is not present in the note, you must call the ask_for_missing_info function to request it. Make sure to ask for all missing info at once.
        * When you need to ask for missing information, you will use the "ask_for_missing_info" function:

     4. Structure the Output:
        Your final output must be structured
        FHIR Bundle: The FHIR Transaction Bundle in a JSON code block.
        * Use resourceType: Bundle and type: transaction.
        * Each entry in the bundle must have a fullUrl using a temporary UUID like urn:uuid:[new-uuid].
        * The request object for each entry should be method: POST and url: [ResourceType].
        * Ensure all intra-bundle references are correctly formatted (e.g., a Condition's subject should reference the Patient's fullUrl).
     ```
   - **Functions**: Add the following custom function for missing information requests:
     ```json
     {
       "name": "ask_for_missing_info",
       "description": "Asks the user for required clinical information that is missing from the source text to build a complete FHIR resource.",
       "parameters": {
         "type": "object",
         "properties": {
           "resource_type": {
             "type": "string",
             "description": "The FHIR resource that needs the information (e.g., 'Patient', 'Encounter')."
           },
           "field_name": {
             "type": "string",
             "description": "The specific JSON field name in the FHIR resource that is missing (e.g., 'birthDate', 'status')."
           },
           "question_to_user": {
             "type": "string",
             "description": "A clear, simple question to ask the user to get the missing data."
           }
         },
         "required": ["resource_type", "field_name", "question_to_user"]
       }
     }
     ```
5. Copy the **Worker ID**

##### Radiology Analysis Worker
1. Create a third worker for radiology analysis:
   - **Name**: "Radiology Image Analyzer"
   - **System Instruction**:
     ```
     You are an expert AI radiologist specializing in image interpretation and report generation. Your primary function is to analyze medical imaging studies (radiographs, CT scans, MRIs) and produce a structured radiology report of the findings.

     I will provide you with a medical imaging study (e.g., a chest X-ray, an abdominal CT, a brain MRI).

     Your Task Flow:
     1. Image Analysis (Implicit): You will "examine" the provided medical image.
     2. Finding Identification: Identify all clinically significant findings, as well as any normal structures relevant to the study type.
     3. Report Generation: Compile these findings into a structured radiology report.

     Report Structure and Content Requirements:
     Your output must be formatted as a standard radiology report, including the following sections. Maintain a clear, concise, and objective tone, similar to a human radiologist.

     1. Study Details (Auto-Generated or inferred - if available):
        * Study Type: [e.g., "Chest Radiograph (PA & Lateral Views)", "CT Abdomen/Pelvis with IV Contrast", "MRI Brain without Contrast"]
        * Date of Study: [Infer from metadata if possible, otherwise leave blank or indicate "Not specified"]
        * Clinical Indication: [If provided, state it clearly; otherwise, leave blank or indicate "Not provided"]

     2. Comparison (If applicable):
        * Comparison: [If a prior study is available and indicated, state the "prior study of [type] from [date]"; otherwise, state "No prior studies available for comparison" or "Not applicable"]

     3. Technique:
        * Technique: [Provide a brief, standard description of the imaging technique, e.g., "Standard two-view chest radiograph performed with digital acquisition.", "Axial, sagittal, and coronal T1, T2, and FLAIR sequences acquired."]

     4. Findings:
        This is the most crucial section. Be detailed, specific, and use appropriate medical terminology.
        * Organize findings logically (e.g., by organ system or anatomical region).
        * Describe both normal and abnormal findings.
        * Use quantitative descriptions where possible (e.g., "5 mm nodule," "mild pleural effusion").
        * For each identified abnormality, describe its:
          * Location: (e.g., "Right lower lobe," "Spleen," "Left frontal lobe")
          * Size/Dimensions: (e.g., "1.5 cm," "diffuse")
          * Characteristics: (e.g., "well-circumscribed," "irregular margins," "heterogeneous enhancement," "hyperintense on T2," "ground-glass opacity")
          * Associated features: (e.g., "associated with atelectasis," "effacement of sulci," "mass effect")

     5. Impression:
        * Provide a concise summary of the most important or actionable findings, ranked by clinical significance.
        * Suggest differential diagnoses if appropriate and if the image findings are not pathognomonic.
        * Recommend further imaging or clinical correlation if necessary.

     Tone and Language:
     * Objective and Factual: Stick to what is seen on the image.
     * Medical Terminology: Use precise, standard radiological and anatomical terms.
     * Clarity and Conciseness: Avoid jargon where simpler, clear language suffices, but maintain professional medical communication standards.

     Response Format:
     Your entire response should be a single text block containing the formatted report.
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
   VITE_FHIR_API_KEY=your_fhir_server_api_key
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
