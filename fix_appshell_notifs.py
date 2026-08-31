import re
with open('apps/web/src/components/AppShell.tsx', 'r') as f:
    text = f.read()

target1 = ''' const [showNotifications, setShowNotifications] = useState(false);
 const queryClient = useQueryClient();

 const { data: notifications = [] } = useQuery({
   queryKey: ['notifications'],
   queryFn: api.notifications.list,
   refetchInterval: 30000,
 });

 const markAsReadMutation = useMutation({
   mutationFn: api.notifications.markAsRead,
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['notifications'] });
   }
 });

 const unreadCount = notifications.filter(n => !n.read).length;'''

target1_alt = "const [showNotifications, setShowNotifications] = useState(false);"

# Remove the block if found
if 'api.notifications.list' in text:
    # Use regex to strip it all out
    text = re.sub(r'const \[showNotifications.*?unreadCount.*?length;', 'const queryClient = useQueryClient();', text, flags=re.DOTALL)
    with open('apps/web/src/components/AppShell.tsx', 'w') as f:
        f.write(text)
