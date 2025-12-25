import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.review.deleteMany();
  await prisma.productCartImage.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  // Product 1: Classic Original
  console.log('📦 Creating Classic Original product...');
  const classicOriginal = await prisma.product.create({
    data: {
      name: 'Classic Original',
      slug: 'classic-original',
      flavor: 'Original',
      brand: 'Swaadly',
      aboutProduct: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEat: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEatImageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/best_way_to_eat_classic_original.svg',
      tags: ['Original', 'Classic', 'Peanut', 'Natural', 'Healthy'],
      isActive: true,
      displayOrder: 1,
      images: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_classic_original_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Classic Original - Desktop',
            displayOrder: 1,
            isPrimary: true,
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_classic_original_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Classic Original - Mobile',
            displayOrder: 1,
            isPrimary: true,
          },
        ],
      },
      cartImages: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_classic_original_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Classic Original - Cart Desktop',
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_classic_original_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Classic Original - Cart Mobile',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'CLASSIC-ORIG-500G',
            weight: 500,
            weightUnit: 'g',
            proteinQuantity: 125.00, // 25g per 100g * 500g
            mrp: 599.00,
            sellingPrice: 499.00,
            discountPercentage: 16.69,
            stockQuantity: 100,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: true,
            displayOrder: 1,
          },
          {
            sku: 'CLASSIC-ORIG-1KG',
            weight: 1000,
            weightUnit: 'g',
            proteinQuantity: 250.00, // 25g per 100g * 1000g
            mrp: 1099.00,
            sellingPrice: 899.00,
            discountPercentage: 18.20,
            stockQuantity: 80,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: false,
            displayOrder: 2,
          },
        ],
      },
    },
    include: {
      variants: true,
    },
  });

  // Product 2: Creamy Chocolate
  console.log('🍫 Creating Creamy Chocolate product...');
  const creamyChocolate = await prisma.product.create({
    data: {
      name: 'Creamy Chocolate',
      slug: 'creamy-chocolate',
      flavor: 'Chocolate',
      brand: 'Swaadly',
      aboutProduct: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEat: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEatImageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/best_way_to_eat_creamy_chocolate.svg',
      tags: ['Creamy', 'Smooth', 'Chocolate', 'Rich', 'Indulgent'],
      isActive: true,
      displayOrder: 2,
      images: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_creamy_chocolate_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Creamy Chocolate - Desktop',
            displayOrder: 1,
            isPrimary: true,
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_creamy_chocolate_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Creamy Chocolate - Mobile',
            displayOrder: 1,
            isPrimary: true,
          },
        ],
      },
      cartImages: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_creamy_chocolate_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Creamy Chocolate - Cart Desktop',
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_creamy_chocolate_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Creamy Chocolate - Cart Mobile',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'CREAMY-CHOC-500G',
            weight: 500,
            weightUnit: 'g',
            proteinQuantity: 115.00, // 23g per 100g * 500g
            mrp: 649.00,
            sellingPrice: 549.00,
            discountPercentage: 15.41,
            stockQuantity: 120,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: true,
            displayOrder: 1,
          },
          {
            sku: 'CREAMY-CHOC-1KG',
            weight: 1000,
            weightUnit: 'g',
            proteinQuantity: 230.00, // 23g per 100g * 1000g
            mrp: 1199.00,
            sellingPrice: 999.00,
            discountPercentage: 16.68,
            stockQuantity: 90,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: false,
            displayOrder: 2,
          },
        ],
      },
    },
    include: {
      variants: true,
    },
  });

  // Product 3: Chocolate Crunchy
  console.log('🥜 Creating Chocolate Crunchy product...');
  const chocolateCrunchy = await prisma.product.create({
    data: {
      name: 'Chocolate Crunchy',
      slug: 'chocolate-crunchy',
      flavor: 'Chocolate Crunchy',
      brand: 'Swaadly',
      aboutProduct: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEat: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      bestWayToEatImageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/best_way_to_eat_chocolate_crunchy.svg',
      tags: ['Crunchy', 'Chewy', 'Peanut', 'Chocolate', 'Textured'],
      isActive: true,
      displayOrder: 3,
      images: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_chocolate_crunchy_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Chocolate Crunchy - Desktop',
            displayOrder: 1,
            isPrimary: true,
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/product_chocolate_crunchy_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Chocolate Crunchy - Mobile',
            displayOrder: 1,
            isPrimary: true,
          },
        ],
      },
      cartImages: {
        create: [
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_chocolate_crunchy_lg.svg',
            deviceType: 'DESKTOP',
            altText: 'Chocolate Crunchy - Cart Desktop',
          },
          {
            imageUrl: 'https://storage.googleapis.com/swaadly-uploads-prod/cart_chocolate_crunchy_sm.svg',
            deviceType: 'MOBILE',
            altText: 'Chocolate Crunchy - Cart Mobile',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'CHOC-CRUNCHY-500G',
            weight: 500,
            weightUnit: 'g',
            proteinQuantity: 120.00, // 24g per 100g * 500g
            mrp: 629.00,
            sellingPrice: 529.00,
            discountPercentage: 15.90,
            stockQuantity: 110,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: true,
            displayOrder: 1,
          },
          {
            sku: 'CHOC-CRUNCHY-1KG',
            weight: 1000,
            weightUnit: 'g',
            proteinQuantity: 240.00, // 24g per 100g * 1000g
            mrp: 1149.00,
            sellingPrice: 949.00,
            discountPercentage: 17.41,
            stockQuantity: 85,
            lowStockThreshold: 10,
            isAvailable: true,
            isDefault: false,
            displayOrder: 2,
          },
        ],
      },
    },
    include: {
      variants: true,
    },
  });

  // Create dummy reviews for Classic Original
  console.log('⭐ Creating reviews for Classic Original...');
  await prisma.review.createMany({
    data: [
      {
        productId: classicOriginal.id,
        variantId: classicOriginal.variants[0].id,
        reviewerName: 'Rahul Sharma',
        reviewerEmail: 'rahul.sharma@example.com',
        rating: 5,
        title: 'Amazing taste!',
        comment: 'This is the best peanut butter I have ever tried. The texture is perfect and the taste is amazing. Highly recommended!',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 12,
        unhelpfulCount: 1,
      },
      {
        productId: classicOriginal.id,
        variantId: classicOriginal.variants[1].id,
        reviewerName: 'Priya Patel',
        reviewerEmail: 'priya.patel@example.com',
        rating: 4,
        title: 'Great value for money',
        comment: 'Good quality peanut butter at an affordable price. The 1kg pack is perfect for my family. Will definitely buy again.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 8,
        unhelpfulCount: 0,
      },
      {
        productId: classicOriginal.id,
        variantId: classicOriginal.variants[0].id,
        reviewerName: 'Amit Kumar',
        reviewerEmail: 'amit.kumar@example.com',
        rating: 5,
        title: 'Perfect for fitness enthusiasts',
        comment: 'As a fitness trainer, I recommend this to all my clients. High protein content and no added sugar. Perfect!',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 15,
        unhelpfulCount: 2,
      },
    ],
  });

  // Create dummy reviews for Creamy Chocolate
  console.log('⭐ Creating reviews for Creamy Chocolate...');
  await prisma.review.createMany({
    data: [
      {
        productId: creamyChocolate.id,
        variantId: creamyChocolate.variants[0].id,
        reviewerName: 'Sneha Desai',
        reviewerEmail: 'sneha.desai@example.com',
        rating: 5,
        title: 'Kids love it!',
        comment: 'My kids absolutely love this chocolate peanut butter. It is so creamy and delicious. A healthy alternative to regular chocolate spreads.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 10,
        unhelpfulCount: 0,
      },
      {
        productId: creamyChocolate.id,
        variantId: creamyChocolate.variants[1].id,
        reviewerName: 'Vikram Singh',
        reviewerEmail: 'vikram.singh@example.com',
        rating: 4,
        title: 'Rich chocolate flavor',
        comment: 'The chocolate flavor is really rich and satisfying. Great for post-workout snacks. The 1kg pack lasts me about a month.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 7,
        unhelpfulCount: 1,
      },
      {
        productId: creamyChocolate.id,
        variantId: creamyChocolate.variants[0].id,
        reviewerName: 'Anjali Mehta',
        reviewerEmail: 'anjali.mehta@example.com',
        rating: 5,
        title: 'Best chocolate peanut butter',
        comment: 'I have tried many chocolate peanut butters but this one is by far the best. The texture is super smooth and the taste is incredible.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 13,
        unhelpfulCount: 0,
      },
    ],
  });

  // Create dummy reviews for Chocolate Crunchy
  console.log('⭐ Creating reviews for Chocolate Crunchy...');
  await prisma.review.createMany({
    data: [
      {
        productId: chocolateCrunchy.id,
        variantId: chocolateCrunchy.variants[0].id,
        reviewerName: 'Rohan Verma',
        reviewerEmail: 'rohan.verma@example.com',
        rating: 5,
        title: 'Perfect texture!',
        comment: 'The crunchy texture is perfect. You can actually taste the peanut chunks. Great for people who prefer some texture in their peanut butter.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 9,
        unhelpfulCount: 0,
      },
      {
        productId: chocolateCrunchy.id,
        variantId: chocolateCrunchy.variants[1].id,
        reviewerName: 'Kavya Iyer',
        reviewerEmail: 'kavya.iyer@example.com',
        rating: 4,
        title: 'Great for sandwiches',
        comment: 'I use this for making sandwiches for my kids. The crunchy bits add a nice texture. They love it!',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 6,
        unhelpfulCount: 1,
      },
      {
        productId: chocolateCrunchy.id,
        variantId: chocolateCrunchy.variants[0].id,
        reviewerName: 'Sanjay Reddy',
        reviewerEmail: 'sanjay.reddy@example.com',
        rating: 5,
        title: 'Addictive!',
        comment: 'This is so addictive! I find myself eating it straight from the jar. The combination of chocolate and crunchy peanuts is irresistible.',
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 11,
        unhelpfulCount: 0,
      },
    ],
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Summary:
  - Products created: 3
  - Product variants created: 6 (2 per product: 500g and 1kg)
  - Product images created: 6 (2 per product: desktop and mobile)
  - Product cart images created: 6 (2 per product: desktop and mobile)
  - Reviews created: 9 (3 per product)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
