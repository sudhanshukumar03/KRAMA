# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

start_str = '{todayIssues.length === 0 ? ('
start_idx = content.find(start_str)

if start_idx == -1:
    print("Start not found")
else:
    # Find the end of this JSX block
    # It ends with: </div>\n )}\n </div>\n )} (wait, it's just )} before </div>\n )} for the main block)
    # Let's just find the next </div>\n )} after {todayIssues.map
    map_str = '{todayIssues.map'
    map_idx = content.find(map_str, start_idx)
    end_str = '</div>\n )}'
    end_idx = content.find(end_str, map_idx)
    
    if end_idx != -1:
        end_idx += len(end_str)
        
        replacement = """{agendaItems.length === 0 ? (
 <div className="py-12 text-center flex flex-col items-center justify-center">
 <Clock className="w-6 h-6 text-muted mb-2 stroke-[1.5]" />
 <p className="text-body font-medium text-primary mb-1">No events scheduled for today</p>
 <p className="text-caption text-secondary mb-4">Your agenda is completely clear. Enjoy your focus time!</p>
 <button onClick={() => setScheduleModalOpen(true)} className="px-3.5 py-1.5 rounded-full bg-[#EFF4FE] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-caption font-medium transition-colors shadow-sm cursor-pointer">
 + Schedule a task
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 {agendaItems.map((item, idx) => {
   
   if (item.type === 'task') {
     const issue = item.data;
     const isDone = issue.status === "DONE" || issue.status === "REVIEW";
     const Icon = getIconForString(issue.title);
     const isCurrent = false; // Tasks don't have explicit times to be "current" easily
     
     return (
       <div key={'task-'+issue.id} className="relative group/timeline">
         <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] border-l-2 border-dashed border-border group-last/timeline:hidden" />
         
         <div className="flex items-start gap-4 relative">
           <div className="w-[80px] shrink-0 text-right pt-2.5">
             <div className="text-[11px] font-medium text-primary">
               {item.isCarriedOver ? 'Overdue' : 'Unscheduled'}
             </div>
           </div>
           
           {/* Timeline Dot */}
           <div className="w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center transition-colors z-10 bg-surface border-2 border-dashed border-border">
             {isDone && <Check className="w-2.5 h-2.5 text-slate-400 stroke-[2]" />}
           </div>
          
           {/* Event Card */}
           <div className={"flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border border-dashed cursor-pointer group/card " + (isDone ? "bg-surface border-border/50 opacity-60" : "bg-surface border-border hover:border-primary shadow-sm")}>
             <div className="flex items-center gap-3.5">
               <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors " + (isDone ? "bg-surface border border-border" : "bg-surface border border-dashed border-border")}>
                 <Icon className={"w-4 h-4 stroke-[1.75] " + (isDone ? "text-muted" : "text-primary")} />
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <h3 className={"font-medium text-body mb-0.5 " + (isDone ? "text-muted line-through decoration-[#D1D5DB]" : "text-primary")}>
                     {issue.title}
                   </h3>
                   {item.isCarriedOver && (
                     <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-mono font-bold uppercase tracking-widest border border-amber-200">
                       Carried Over
                     </span>
                   )}
                 </div>
                 <div className="text-badge text-secondary font-mono">
                   {issue.estimateMinutes ? ${issue.estimateMinutes}m : 'Task'}
                 </div>
               </div>
             </div>
             <button onClick={(e) => { e.stopPropagation(); deleteIssueMutation.mutate(issue.id); }} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shrink-0">
               <Trash2 className="w-4 h-4" />
             </button>
           </div>
         </div>
       </div>
     );
   }

   // TimeBlock rendering
   const tb = item.data;
   const hasLinkedTask = !!item.linkedTask;
   const issueTitle = hasLinkedTask ? item.linkedTask.title : tb.title;
   const issueObj = hasLinkedTask ? item.linkedTask : tb;
   const isDone = hasLinkedTask ? (issueObj.status === "DONE" || issueObj.status === "REVIEW") : false; // TimeBlocks themselves don't have "status"
   const Icon = getIconForString(issueTitle);
   
   const now = currentTime.getTime();
   const tbStart = new Date(tb.startTime).getTime();
   const tbEnd = new Date(tb.endTime).getTime();
   const isCurrent = now >= tbStart && now <= tbEnd;
   const isPast = now > tbEnd;

   const formatTime = (iso: string) => {
     return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
   };

   return (
     <div key={'tb-'+tb.id} className="relative group/timeline">
       <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] bg-border group-last/timeline:hidden" />
       
       <div className="flex items-start gap-4 relative">
         <div className="w-[80px] shrink-0 text-right pt-2.5 flex flex-col gap-0.5">
           <div className="text-[12px] font-bold text-primary">
             {formatTime(tb.startTime)}
           </div>
           <div className="text-[10px] font-medium text-secondary">
             {formatTime(tb.endTime)}
           </div>
         </div>
         
         {/* Timeline Dot */}
         <div className={"w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center transition-colors z-10 " + (isDone ? "bg-primary" : isCurrent ? "bg-[#2563EB] ring-2 ring-[#EFF4FE]" : isPast ? "bg-surface border-2 border-border" : "bg-surface border-2 border-[#2563EB]")}>
           {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[2]" />}
           {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />}
         </div>
        
         {/* Event Card */}
         <div className={"flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border cursor-pointer group/card " + (isDone ? "bg-surface border-border/50 opacity-60" : isCurrent ? "bg-surface border-[#2563EB] ring-1 ring-[#2563EB]/20 shadow-md" : "bg-surface border-border hover:border-primary shadow-sm")}>
           <div className="flex items-center gap-3.5">
             <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors " + (isDone ? "bg-surface border border-border" : isCurrent ? "bg-[#2563EB] text-white shadow-xs" : "bg-[#EFF4FE] border border-[#2563EB]/20")}>
               <Icon className={"w-4 h-4 stroke-[1.75] " + (isDone ? "text-muted" : isCurrent ? "text-white" : "text-[#2563EB]")} />
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className={"font-medium text-body mb-0.5 " + (isDone ? "text-muted line-through decoration-[#D1D5DB]" : "text-primary")}>
                   {issueTitle}
                 </h3>
                 {isCurrent && (
                   <span className="px-1.5 py-0.2 rounded bg-[#EFF4FE] text-[#2563EB] text-[9px] font-mono font-bold uppercase tracking-widest border border-[#2563EB]/20">
                     In Progress Now
                   </span>
                 )}
                 {hasLinkedTask && (
                   <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-mono font-bold uppercase tracking-widest border border-purple-200">
                     Linked Task
                   </span>
                 )}
               </div>
               <div className="text-badge text-secondary font-mono flex items-center gap-1.5">
                 <span className="px-1.5 py-0.5 bg-surface-hover rounded border border-border">{tb.type} Block</span>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 })}
 </div>
 )}"""

        new_content = content[:start_idx] + replacement + content[end_idx:]
        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(new_content)
        print("Replaced successfully")
    else:
        print("End not found")
