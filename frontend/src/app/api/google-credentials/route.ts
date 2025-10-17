import { PrismaClient } from '@/generated/prisma';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

const prisma = new PrismaClient()

export async function GET() {
  try {
    const credentials = await prisma.googleCredentials.findFirst()

    if (!credentials) {
      return NextResponse.json({
        googleApiKey: '',
        googleCloudProject: '',
        googleCloudRegion: 'us-central1',
        googleApplicationCredentials: '',
        gcsBucketName: '',
        gcsProjectId: '',
        gcsCredentialsPath: '',
        secretKey: '',
        algorithm: 'HS256',
        accessTokenExpireMinutes: 30,
        maxFileSize: 10485760,
        uploadDir: 'uploads',
        logLevel: 'INFO',
        logFile: 'logs/app.log'
      })
    }

    return NextResponse.json({
      googleApiKey: credentials.googleApiKey,
      googleCloudProject: credentials.googleCloudProject,
      googleCloudRegion: credentials.googleCloudRegion,
      googleApplicationCredentials: credentials.googleApplicationCredentials || '',
      gcsBucketName: credentials.gcsBucketName,
      gcsProjectId: credentials.gcsProjectId,
      gcsCredentialsPath: credentials.gcsCredentialsPath || '',
      secretKey: credentials.secretKey,
      algorithm: credentials.algorithm,
      accessTokenExpireMinutes: credentials.accessTokenExpireMinutes,
      maxFileSize: credentials.maxFileSize,
      uploadDir: credentials.uploadDir,
      logLevel: credentials.logLevel,
      logFile: credentials.logFile
    })
  } catch (error) {
    console.error('Error reading Google credentials:', error)
    return NextResponse.json(
      { error: 'Failed to read Google credentials' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const credentials = await request.json()

    await saveGoogleCredentialsToDB(credentials)
    await updateApiGoogleEnv(credentials)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving Google credentials:', error)
    return NextResponse.json(
      { error: 'Failed to save Google credentials' },
      { status: 500 }
    )
  }
}

async function saveGoogleCredentialsToDB(data: Record<string, unknown>) {
  if (!data.googleApiKey || !data.googleCloudProject) {
    throw new Error('Google API Key and Cloud Project are required')
  }

  const existingCredentials = await prisma.googleCredentials.findFirst()

  if (existingCredentials) {
    await prisma.googleCredentials.update({
      where: { id: existingCredentials.id },
      data: {
        googleApiKey: data.googleApiKey as string,
        googleCloudProject: data.googleCloudProject as string,
        googleCloudRegion: (data.googleCloudRegion as string) || 'us-central1',
        googleApplicationCredentials: (data.googleApplicationCredentials as string) || null,
        gcsBucketName: data.gcsBucketName as string,
        gcsProjectId: data.gcsProjectId as string,
        gcsCredentialsPath: (data.gcsCredentialsPath as string) || null,
        secretKey: data.secretKey as string,
        algorithm: (data.algorithm as string) || 'HS256',
        accessTokenExpireMinutes: (data.accessTokenExpireMinutes as number) || 30,
        maxFileSize: (data.maxFileSize as number) || 10485760,
        uploadDir: (data.uploadDir as string) || 'uploads',
        logLevel: (data.logLevel as string) || 'INFO',
        logFile: (data.logFile as string) || 'logs/app.log'
      }
    })
  } else {
    await prisma.googleCredentials.create({
      data: {
        googleApiKey: data.googleApiKey as string,
        googleCloudProject: data.googleCloudProject as string,
        googleCloudRegion: (data.googleCloudRegion as string) || 'us-central1',
        googleApplicationCredentials: (data.googleApplicationCredentials as string) || null,
        gcsBucketName: data.gcsBucketName as string,
        gcsProjectId: data.gcsProjectId as string,
        gcsCredentialsPath: (data.gcsCredentialsPath as string) || null,
        secretKey: data.secretKey as string,
        algorithm: (data.algorithm as string) || 'HS256',
        accessTokenExpireMinutes: (data.accessTokenExpireMinutes as number) || 30,
        maxFileSize: (data.maxFileSize as number) || 10485760,
        uploadDir: (data.uploadDir as string) || 'uploads',
        logLevel: (data.logLevel as string) || 'INFO',
        logFile: (data.logFile as string) || 'logs/app.log'
      }
    })
  }
}

async function updateApiGoogleEnv(credentials: Record<string, unknown>) {
  const envPath = path.join(process.cwd(), '..', 'api_google', '.env')

  const envContent = `# Google Cloud Configuration
GOOGLE_API_KEY=${credentials.googleApiKey}
GOOGLE_CLOUD_PROJECT=${credentials.googleCloudProject}
GOOGLE_CLOUD_REGION=${credentials.googleCloudRegion || 'us-central1'}
GOOGLE_APPLICATION_CREDENTIALS=${credentials.googleApplicationCredentials || ''}

# Google Cloud Storage
GCS_BUCKET_NAME=${credentials.gcsBucketName}
GCS_PROJECT_ID=${credentials.gcsProjectId}
GCS_CREDENTIALS_PATH=${credentials.gcsCredentialsPath || ''}

# Database
DATABASE_URL=postgresql://postgres:password@db:5432/frontend_db

# Redis
REDIS_URL=redis://redis:6379/0

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# Security
SECRET_KEY=${credentials.secretKey}
ALGORITHM=${credentials.algorithm || 'HS256'}
ACCESS_TOKEN_EXPIRE_MINUTES=${credentials.accessTokenExpireMinutes || 30}

# File Upload
MAX_FILE_SIZE=${credentials.maxFileSize || 10485760}
UPLOAD_DIR=${credentials.uploadDir || 'uploads'}

# Logging
LOG_LEVEL=${credentials.logLevel || 'INFO'}
LOG_FILE=${credentials.logFile || 'logs/app.log'}
`

  try {
    fs.writeFileSync(envPath, envContent)
    console.log('API Google .env updated successfully')
  } catch (error) {
    console.error('Error updating API Google .env:', error)
  }
}
