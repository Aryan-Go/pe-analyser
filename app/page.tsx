import { Button } from "@/components/ui/button";
import { api } from "@/lib/eden";

export default async function Home() {
  const {data} = await api.get()

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1>Hi there!</h1>
        <p>{data}</p>
        <Button>
          Hi there
        </Button>
      </main>
    </div>
  );
}
