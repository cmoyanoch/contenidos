import bcrypt from 'bcryptjs'
import type { User } from '@prisma/client'
import { prisma } from './prisma'

export interface RegisterData {
  email: string
  name: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export class AuthService {
  // Registrar nuevo usuario
  static async register(data: RegisterData) {
    const { email, name, password } = data

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error('El usuario ya existe')
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    return user
  }

  // Autenticar usuario
  static async login(data: LoginData) {
    const { email, password } = data

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error('Credenciales inválidas')
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas')
    }

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  // Verificar si el email existe
  static async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email }
    })
    return !!user
  }
}
