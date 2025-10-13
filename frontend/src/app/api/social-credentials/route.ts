import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@/generated/prisma'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const credentials = await prisma.socialCredentials.findMany()

    const formattedCredentials = {
      instagram: { accessToken: '', accountId: '' },
      facebook: { accessToken: '', pageId: '' },
      linkedin: { accessToken: '', personId: '' },
      whatsapp: { accessToken: '', phoneNumberId: '', businessAccountId: '' }
    }

    credentials.forEach(cred => {
      if (cred.platform === 'instagram') {
        formattedCredentials.instagram = {
          accessToken: cred.accessToken,
          accountId: cred.accountId || ''
        }
      } else if (cred.platform === 'facebook') {
        formattedCredentials.facebook = {
          accessToken: cred.accessToken,
          pageId: cred.pageId || ''
        }
      } else if (cred.platform === 'linkedin') {
        formattedCredentials.linkedin = {
          accessToken: cred.accessToken,
          personId: cred.personId || ''
        }
      } else if (cred.platform === 'whatsapp') {
        formattedCredentials.whatsapp = {
          accessToken: cred.accessToken,
          phoneNumberId: cred.phoneNumberId || '',
          businessAccountId: cred.businessAccountId || ''
        }
      }
    })

    return NextResponse.json(formattedCredentials)
  } catch (error) {
    console.error('Error reading credentials:', error)
    return NextResponse.json(
      { error: 'Failed to read credentials' },
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

    await Promise.all([
      saveCredentialsToDB('instagram', credentials.instagram),
      saveCredentialsToDB('facebook', credentials.facebook),
      saveCredentialsToDB('linkedin', credentials.linkedin),
      saveCredentialsToDB('whatsapp', credentials.whatsapp)
    ])

    await updateApiRrssEnv(credentials)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving credentials:', error)
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    )
  }
}

async function saveCredentialsToDB(platform: string, data: any) {
  if (!data.accessToken) return

  await prisma.socialCredentials.upsert({
    where: { platform },
    update: {
      accessToken: data.accessToken,
      accountId: data.accountId || null,
      pageId: data.pageId || null,
      personId: data.personId || null,
      phoneNumberId: data.phoneNumberId || null,
      businessAccountId: data.businessAccountId || null
    },
    create: {
      platform,
      accessToken: data.accessToken,
      accountId: data.accountId || null,
      pageId: data.pageId || null,
      personId: data.personId || null,
      phoneNumberId: data.phoneNumberId || null,
      businessAccountId: data.businessAccountId || null
    }
  })
}

async function updateApiRrssEnv(credentials: any) {
  const envPath = path.join(process.cwd(), '..', 'api_rrss', '.env')

  const envContent = `# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=${credentials.instagram.accessToken}
INSTAGRAM_ACCOUNT_ID=${credentials.instagram.accountId}

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=${credentials.facebook.accessToken}
FACEBOOK_PAGE_ID=${credentials.facebook.pageId}

# LinkedIn API
LINKEDIN_ACCESS_TOKEN=${credentials.linkedin.accessToken}
LINKEDIN_PERSON_ID=${credentials.linkedin.personId}

# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=${credentials.whatsapp.accessToken}
WHATSAPP_PHONE_NUMBER_ID=${credentials.whatsapp.phoneNumberId}
WHATSAPP_BUSINESS_ACCOUNT_ID=${credentials.whatsapp.businessAccountId}
`

  try {
    fs.writeFileSync(envPath, envContent)
    console.log('API RRSS .env updated successfully')
  } catch (error) {
    console.error('Error updating API RRSS .env:', error)
  }
}