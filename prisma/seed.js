const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting THIGAZH (திகழ்) database seeding...');

  // Clean existing data in reverse order of dependencies
  await prisma.ticket.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketHoldItem.deleteMany();
  await prisma.ticketHold.deleteMany();
  await prisma.ticketTier.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Create Users with hashed passwords
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('Password@123', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Thigazh',
      email: 'admin@thigazh.com',
      passwordHash: commonPasswordHash,
      role: 'ADMIN',
    },
  });

  const organizer1 = await prisma.user.create({
    data: {
      name: 'Ananya Krishnan',
      email: 'organizer@thigazh.com',
      passwordHash: commonPasswordHash,
      role: 'ORGANIZER',
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      name: 'Vikram Sundaram',
      email: 'vikram@zenithtech.org',
      passwordHash: commonPasswordHash,
      role: 'ORGANIZER',
    },
  });

  const attendee = await prisma.user.create({
    data: {
      name: 'Poojaa Prakash',
      email: 'attendee@thigazh.com',
      passwordHash: commonPasswordHash,
      role: 'ATTENDEE',
    },
  });

  console.log('✅ Users seeded:');
  console.log('   - Admin: admin@thigazh.com / Password@123');
  console.log('   - Organizer 1: organizer@thigazh.com / Password@123');
  console.log('   - Organizer 2: vikram@zenithtech.org / Password@123');
  console.log('   - Attendee: attendee@thigazh.com / Password@123');

  // Create Organizations
  const orgKalaignan = await prisma.organization.create({
    data: {
      name: 'Kalaignan Arts & Music',
      slug: 'kalaignan-arts',
      ownerId: organizer1.id,
    },
  });

  const orgZenith = await prisma.organization.create({
    data: {
      name: 'Zenith Tech Conclave',
      slug: 'zenith-tech',
      ownerId: organizer2.id,
    },
  });

  console.log('✅ Organizations seeded.');

  // Create Events & Ticket Tiers
  // Event 1: Classical Fusion
  const event1 = await prisma.event.create({
    data: {
      organizationId: orgKalaignan.id,
      title: 'Thigazh Margazhi Classical Fusion 2026',
      slug: 'thigazh-margazhi-classical-fusion-2026',
      description: 'An ethereal evening blending pure Carnatic vocal ragas with contemporary orchestral strings and percussion. Featuring renowned maestros celebrating Tamil musical heritage with a modern sonic tapestry.',
      category: 'Music & Concerts',
      venue: 'The Music Academy, Main Auditorium',
      city: 'Chennai',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
      endAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'Balcony Reserved',
            description: 'Elevated panoramic stage view with acoustic clarity',
            price: 49900, // ₹499
            currency: 'INR',
            totalQuantity: 100,
            soldQuantity: 12,
            reservedQuantity: 0,
          },
          {
            name: 'Grand Orchestra',
            description: 'Prime central acoustics and comfortable tiered seating',
            price: 149900, // ₹1,499
            currency: 'INR',
            totalQuantity: 80,
            soldQuantity: 8,
            reservedQuantity: 0,
          },
          {
            name: 'Patron Box & VIP Lounge',
            description: 'Exclusive box seating with artist meet & greet reception',
            price: 349900, // ₹3,499
            currency: 'INR',
            totalQuantity: 25,
            soldQuantity: 4,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  // Event 2: Tech Conclave
  const event2 = await prisma.event.create({
    data: {
      organizationId: orgZenith.id,
      title: 'Silicon Coast AI & DeepTech Conclave',
      slug: 'silicon-coast-ai-deeptech-conclave',
      description: 'South India’s premier gathering of AI researchers, founders, enterprise architects, and venture leaders exploring autonomous intelligence, LLMs, and quantum computing infrastructure.',
      category: 'Technology & AI',
      venue: 'ITC Grand Chola Convention Center',
      city: 'Chennai',
      startAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'Conference Delegate',
            description: 'Access to keynote sessions, breakout tracks, and exhibition hall',
            price: 199900, // ₹1,999
            currency: 'INR',
            totalQuantity: 250,
            soldQuantity: 35,
            reservedQuantity: 0,
          },
          {
            name: 'VIP Executive Pass',
            description: 'All-access delegate pass with private executive dinner & investor matchmaking',
            price: 599900, // ₹5,999
            currency: 'INR',
            totalQuantity: 50,
            soldQuantity: 10,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  // Event 3: Food & Culinary
  const event3 = await prisma.event.create({
    data: {
      organizationId: orgKalaignan.id,
      title: 'Southern Flavors & Heritage Culinary Masterclass',
      slug: 'southern-flavors-heritage-culinary-masterclass',
      description: 'An interactive hands-on gastronomic journey through traditional Kongunadu and Chettinad spice alchemy led by master culinary historians.',
      category: 'Food & Culinary',
      venue: 'Hyatt Regency Artisan Studio',
      city: 'Chennai',
      startAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'Masterclass Seat',
            description: 'Hands-on station, ingredient hamper, and curated degustation lunch',
            price: 129900, // ₹1,299
            currency: 'INR',
            totalQuantity: 40,
            soldQuantity: 15,
            reservedQuantity: 0,
          },
          {
            name: 'Chef’s Table Duo (Couple)',
            description: 'Dedicated couple prep station with sommelier wine pairing',
            price: 239900, // ₹2,399
            currency: 'INR',
            totalQuantity: 15,
            soldQuantity: 5,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  // Event 4: Indie Rock & Electronic
  const event4 = await prisma.event.create({
    data: {
      organizationId: orgKalaignan.id,
      title: 'Kovai Indie Horizons Music Festival',
      slug: 'kovai-indie-horizons-music-festival',
      description: 'Electrifying open-air indie rock, synth-pop, and live electronica under the starry western ghats breeze.',
      category: 'Music & Concerts',
      venue: 'Hindusthan Grounds Arena',
      city: 'Coimbatore',
      startAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'General Arena Entry',
            description: 'Festival grounds standing access with food village entry',
            price: 69900, // ₹699
            currency: 'INR',
            totalQuantity: 300,
            soldQuantity: 60,
            reservedQuantity: 0,
          },
          {
            name: 'Front Stage Fan Pit',
            description: 'Immediate stage-front enclosure with express bar access',
            price: 179900, // ₹1,799
            currency: 'INR',
            totalQuantity: 80,
            soldQuantity: 20,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  // Event 5: Pottery & Terracotta Workshop
  const event5 = await prisma.event.create({
    data: {
      organizationId: orgKalaignan.id,
      title: 'Terracotta & Heritage Wheel Pottery Workshop',
      slug: 'terracotta-heritage-wheel-pottery-workshop',
      description: 'Learn timeless pottery techniques using authentic clay wheels, hand sculpting, and kiln glazing guided by master traditional artisans.',
      category: 'Arts & Workshops',
      venue: 'DakshinaChitra Heritage Village',
      city: 'Chennai',
      startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'Workshop Seat & Clay Kit',
            description: 'Complete wheel session with take-home baked pottery artifact',
            price: 89900, // ₹899
            currency: 'INR',
            totalQuantity: 30,
            soldQuantity: 6,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  // Event 6: Tamil Cinema & Screenwriters Roundtable
  const event6 = await prisma.event.create({
    data: {
      organizationId: orgKalaignan.id,
      title: 'Tamil Cinema & Screenwriters Roundtable',
      slug: 'tamil-cinema-screenwriters-roundtable',
      description: 'An intimate panel discussion breaking down screenplay structure, character dynamics, and narrative rhythm in contemporary Tamil cinema.',
      category: 'Cinema & Culture',
      venue: 'TAG Auditorium, South Beach Road',
      city: 'Chennai',
      startAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      salesStartAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      salesCutoffAt: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      ticketTiers: {
        create: [
          {
            name: 'General Delegate',
            description: 'Access to panel questions and souvenir screenplay draft notes',
            price: 79900, // ₹799
            currency: 'INR',
            totalQuantity: 100,
            soldQuantity: 18,
            reservedQuantity: 0,
          },
          {
            name: 'Masterclass & Networking Dinner',
            description: 'Includes closed-door script feedback session with guest directors',
            price: 199900, // ₹1,999
            currency: 'INR',
            totalQuantity: 20,
            soldQuantity: 7,
            reservedQuantity: 0,
          },
        ],
      },
    },
    include: { ticketTiers: true },
  });

  console.log('✅ 6 Featured events with realistic ticket tiers seeded.');

  // Create an initial sample completed order for Attendee so they have historical bookings
  const tier1 = event1.ticketTiers[0];
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'THG-ORD-202610-001',
      userId: attendee.id,
      eventId: event1.id,
      status: 'COMPLETED',
      totalAmount: tier1.price * 2,
      currency: 'INR',
      idempotencyKey: 'seed-idemp-key-attendee-001',
      items: {
        create: [
          {
            ticketTierId: tier1.id,
            quantity: 2,
            unitPrice: tier1.price,
            tickets: {
              create: [
                {
                  ticketTierId: tier1.id,
                  userId: attendee.id,
                  verificationToken: 'TKT-VF-KALAIGNAN-001-A',
                  status: 'VALID',
                },
                {
                  ticketTierId: tier1.id,
                  userId: attendee.id,
                  verificationToken: 'TKT-VF-KALAIGNAN-001-B',
                  status: 'VALID',
                },
              ],
            },
          },
        ],
      },
      transactions: {
        create: [
          {
            paymentReference: 'PAY-MOCK-REF-SEED-001',
            idempotencyKey: 'seed-pay-idemp-001',
            amount: tier1.price * 2,
            currency: 'INR',
            status: 'APPROVED',
            processedAt: new Date(),
            gatewayResponse: JSON.stringify({
              gateway: 'THIGAZH_MOCK_PAYMENT',
              status: 'APPROVED',
              method: 'UPI_SIMULATED',
              bankRrn: '883719283710',
            }),
          },
        ],
      },
    },
  });

  console.log('✅ Sample completed order and 2 digital tickets created for attendee.');
  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
