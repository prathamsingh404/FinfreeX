import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="min-h-screen bg-[#0D0D15] text-slate-200 p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-xl font-bold mb-4 tracking-tight text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          Todo List (Supabase SSR)
        </h1>
        <ul className="space-y-2">
          {todos && todos.length > 0 ? (
            todos.map((todo) => (
              <li key={todo.id} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium">{todo.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
              </li>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              No todos found. Make sure your 'todos' table has data in Supabase.
            </div>
          )}
        </ul>
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Connected</span>
          <a href="/" className="hover:text-indigo-400 transition-colors uppercase font-bold">← Dashboard</a>
        </div>
      </div>
    </div>
  )
}
