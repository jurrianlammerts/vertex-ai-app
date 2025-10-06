# Google Vertex AI Credentials Setup

This guide will help you set up the required credentials to run the AI-powered travel planner.

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_PLACES_API_KEY=your-api-key-here
```

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter a project name and click "Create"
4. **Important:** Note your **Project ID** (shown below the project name)

### 2. Enable Required APIs

Enable these APIs in your project:

1. **Vertex AI API:**
   - Go to [Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)
   - Click "Enable"

2. **Places API** (for map features):
   - Go to [Places API](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)
   - Click "Enable"

### 3. Create a Service Account

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter a name (e.g., "expo-ai-vertex")
4. Click "Create and Continue"
5. Grant these roles:
   - **Vertex AI User** (required for AI features)
6. Click "Continue" → "Done"

### 4. Download Service Account Key

1. In the Service Accounts page, find your newly created service account
2. Click on it to open details
3. Go to the "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON" format
6. Click "Create"
7. **Save the downloaded file as `google-credentials.json` in your project root**

### 5. Get Google Places API Key (Optional - for map features)

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. (Recommended) Click "Restrict Key":
   - Under "API restrictions", select "Restrict key"
   - Select "Places API"
   - Click "Save"

### 6. Create Your .env File

Create a `.env` file in the project root:

```bash
# Replace with your actual values:
GOOGLE_VERTEX_PROJECT=your-actual-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_PLACES_API_KEY=your-actual-api-key
```

### 7. Verify Setup

Your project directory should look like this:

```
expo-ai/
├── .env                         # ← Your credentials (gitignored)
├── google-credentials.json      # ← Your service account key (gitignored)
├── components/
├── app/
└── ...
```

### 8. Restart Your Development Server

```bash
npm start
```

## Available Regions

Choose a region close to your users for better performance:

- `us-central1` (Iowa, USA)
- `us-east4` (Virginia, USA)
- `us-west1` (Oregon, USA)
- `europe-west1` (Belgium)
- `europe-west4` (Netherlands)
- `asia-northeast1` (Tokyo, Japan)
- `asia-southeast1` (Singapore)

[See all available regions](https://cloud.google.com/vertex-ai/docs/general/locations)

## Security Notes

⚠️ **Important:** 
- Never commit `.env` or `google-credentials.json` to version control
- These files are already in `.gitignore`
- Keep your service account credentials secure
- Rotate your API keys regularly
- Consider using environment-specific service accounts for production

## Troubleshooting

### Error: "Could not load the default credentials"
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to the correct JSON file
- Verify the file exists at the specified path
- Check that the path is relative to your project root

### Error: "Permission denied"
- Verify your service account has the "Vertex AI User" role
- Check that the Vertex AI API is enabled in your project
- Wait a few minutes after creating the service account (IAM changes can take time to propagate)

### Error: "Project not found"
- Double-check your `GOOGLE_VERTEX_PROJECT` matches your Project ID (not project name)
- Verify you're using the correct Google Cloud account

## Cost Information

- Vertex AI uses a pay-as-you-go pricing model
- Gemini models have different pricing tiers
- Set up [billing alerts](https://console.cloud.google.com/billing) to monitor costs
- See [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing) for details

## Support

For more help, see:
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [AI SDK Google Vertex Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex)

