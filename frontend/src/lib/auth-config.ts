import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthService } from './auth';
import { prisma } from './prisma';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await AuthService.login({
            email: credentials.email,
            password: credentials.password
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null
          }
        } catch (error) {
          console.error('Error en autenticación:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    session: async ({ session, token }: { session: any; token: any }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    jwt: async ({ user, token }: { user: any; token: any }) => {
      if (user) {
        token.uid = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/login',
  },
}
