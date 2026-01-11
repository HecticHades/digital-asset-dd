import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Check if organization already exists
  let org = await prisma.organization.findFirst({
    where: { name: 'Default Organization' }
  })

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Default Organization',
      },
    })
    console.log('Created organization:', org.name)
  } else {
    console.log('Organization already exists:', org.name)
  }

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        organizationId: org.id,
        isActive: true,
      },
    })

    console.log('Created admin user:', admin.email)
    console.log('')
    console.log('Login credentials:')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('')
    console.log('⚠️  Change the password after first login!')
  } else {
    console.log('Admin user already exists:', existingAdmin.email)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
