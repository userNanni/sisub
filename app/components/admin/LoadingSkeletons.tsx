import Skeleton from "~/components/Skeleton";

export default function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:gap-8">
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex flex-col items-center">
          <Skeleton className="h-40 w-40 rounded-lg mb-4" />
          <div className="flex gap-2 w-full">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-[520px] w-full rounded-lg" />
      </div>
    </div>
  );
}
