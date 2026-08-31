import re

with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    text = f.read()

target1 = "const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });"
replacement1 = "const { data: pages = [] } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });\n const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list, refetchInterval: 30000 });\n const markAsReadMutation = useMutation({ mutationFn: api.notifications.markAsRead, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); } });\n const unreadCount = notifications.filter((n: any) => !n.read).length;\n const [showNotifs, setShowNotifs] = React.useState(false);"

if 'showNotifs' not in text:
    text = text.replace(target1, replacement1)
    text = text.replace("import { Link, useLocation } from 'react-router-dom';", "import React from 'react';\nimport { Link, useLocation } from 'react-router-dom';")

target2 = "   {/* Theme Toggle Action */}"
replacement2 = '''   {/* Notifications Action */}
   <div className="px-3 py-2 border-t border-border relative">
   <button
   onClick={() => setShowNotifs(!showNotifs)}
   className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-caption font-medium text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-transparent hover:border-border group cursor-pointer"
   >
   <span className="flex items-center gap-2">
   <Bell className="w-3.5 h-3.5" />
   <span>Notifications</span>
   </span>
   {unreadCount > 0 && (
     <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
       {unreadCount}
     </span>
   )}
   </button>
   
   {showNotifs && (
     <div className="absolute bottom-full left-3 mb-2 w-72 bg-surface border border-border shadow-2xl rounded-xl overflow-hidden z-50">
       <div className="flex items-center justify-between p-3 border-b border-border bg-surface-hover">
         <span className="font-semibold text-primary text-sm">Notifications</span>
         <button onClick={() => setShowNotifs(false)} className="text-muted hover:text-primary"><X className="w-4 h-4"/></button>
       </div>
       <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
         {notifications.length === 0 ? (
           <p className="text-xs text-center text-muted p-4">You're all caught up!</p>
         ) : (
           notifications.map((n: any) => (
             <div key={n.id} className={p-2 rounded-lg mb-1 text-xs cursor-pointer hover:bg-surface-hover transition-colors } onClick={() => !n.read && markAsReadMutation.mutate(n.id)}>
               <div className="flex justify-between items-start mb-1">
                 <span className="font-semibold text-primary">{n.title}</span>
                 <span className="text-[9px] text-muted">{new Date(n.createdAt).toLocaleTimeString()}</span>
               </div>
               <p className="text-secondary">{n.message}</p>
             </div>
           ))
         )}
       </div>
     </div>
   )}
   </div>

   {/* Theme Toggle Action */}'''

if 'Notifications Action' not in text:
    text = text.replace(target2, replacement2)

target3 = "  import { useQuery } from '@tanstack/react-query';"
replacement3 = "  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';"
if 'useMutation' not in target3 and 'useMutation' not in text.split('\n')[2]:
    text = text.replace(target3, replacement3)

target4 = " const { theme, toggleTheme } = useTheme();"
replacement4 = " const { theme, toggleTheme } = useTheme();\n const queryClient = useQueryClient();"
if 'const queryClient' not in text:
    text = text.replace(target4, replacement4)

target5 = "Search, LogOut, Moon, Sun, Download, X"
replacement5 = "Search, LogOut, Moon, Sun, Download, X, Bell"
if 'Bell' not in text.split('\n')[6]:
    text = text.replace(target5, replacement5)

with open('apps/web/src/components/Sidebar.tsx', 'w') as f:
    f.write(text)
