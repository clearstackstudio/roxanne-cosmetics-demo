import { notFound } from 'next/navigation';
import { findProduct, PRODUCTS, productsIn } from '@/data/products';
import ProductDetail from '@/components/ProductDetail';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = findProduct(id);
  if (!product) notFound();

  const related = productsIn(product.category).filter((p) => p.id !== product.id).slice(0, 4);
  return <ProductDetail product={product} related={related} />;
}
