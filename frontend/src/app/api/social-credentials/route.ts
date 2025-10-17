import { PrismaClient } from '@/generated/prisma';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

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

async function saveCredentialsToDB(platform: string, data: Record<string, unknown>) {
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
      accessToken: data.accessToken as string,
      accountId: data.accountId as string | null,
      pageId: data.pageId as string | null,
      personId: data.personId as string | null,
      phoneNumberId: data.phoneNumberId as string | null,
      businessAccountId: data.businessAccountId as string | null
    }
  })
}

async function updateApiRrssEnv(credentials: Record<string, unknown>) {
  const envPath = path.join(process.cwd(), '..', 'api_rrss', '.env')

  const envContent = `# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=${(credentials as Record<string, unknown> & { instagram: { accessToken: string; accountId: string | null } }).instagram?.accessToken as string}
INSTAGRAM_ACCOUNT_ID=${(credentials as Record<string, unknown> & { instagram: { accountId: string | null } }).instagram?.accountId as string | null}

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=${(credentials as Record<string, unknown> & { facebook: { accessToken: string; pageId: string } }).facebook?.accessToken as string}
FACEBOOK_PAGE_ID=${(credentials as Record<string, unknown> & { facebook: { pageId: string } }).facebook?.pageId as string}

# LinkedIn API
LINKEDIN_ACCESS_TOKEN=${(credentials as Record<string, unknown> & { linkedin: { accessToken: string; personId: string } }).linkedin?.accessToken as string}
LINKEDIN_PERSON_ID=${(credentials as Record<string, unknown> & { linkedin: { personId: string } }).linkedin?.personId as string}

# WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=${(credentials as Record<string, unknown> & { whatsapp: { accessToken: string; phoneNumberId: string; businessAccountId: string } }).whatsapp?.accessToken as string}
WHATSAPP_PHONE_NUMBER_ID=${(credentials as Record<string, unknown> & { whatsapp: { phoneNumberId: string } }).whatsapp?.phoneNumberId as string}
WHATSAPP_BUSINESS_ACCOUNT_ID=${(credentials as Record<string, unknown> & { whatsapp: { businessAccountId: string } }).whatsapp?.businessAccountId as string}
`

  try {
    fs.writeFileSync(envPath, envContent)
    console.log('API RRSS .env updated successfully')
  } catch (error) {
    console.error('Error updating API RRSS .env:', error)
  }
}
