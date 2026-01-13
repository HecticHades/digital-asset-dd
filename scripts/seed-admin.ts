import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Default Organization',
      isActive: true,
    },
  })

  console.log('Organization created:', org.name)

  // Hash password
  const password = 'Admin123!'
  const passwordHash = await bcrypt.hash(password, 12)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@digitalassetdd.com' },
    update: {},
    create: {
      email: 'admin@digitalassetdd.com',
      name: 'Admin User',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      organizationId: org.id,
    },
  })

  console.log('Admin user created:', admin.email)
  console.log('')
  console.log('=== LOGIN CREDENTIALS ===')
  console.log('Email: admin@digitalassetdd.com')
  console.log('Password: Admin123!')
  console.log('=========================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
