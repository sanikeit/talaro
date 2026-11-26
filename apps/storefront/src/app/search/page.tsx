import { Metadata } from "next";
import { SearchPageContent } from "@/components/search/search-page-content";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; pincode?: string }>;
}): Promise<Metadata> {
  const { q } = (await searchParams) || {};
  if (q && q.trim()) {
    return {
      title: `Search results for ${q.trim()}`,
      description: `Find ${q.trim()} from verified local sellers near you.`,
    };
  }
  return {
    title: "Search",
    description: "Search products across verified local sellers on Talaro.",
  };
}

export default function RootSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    pincode?: string;
    limit?: string;
    offset?: string;
  }>;
}) {
  return <SearchPageContent searchParams={searchParams} />;
}
