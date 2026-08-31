with open('apps/server/prisma/schema.prisma', 'r') as f:
    text = f.read()

rule_model = """
model AutomationRule {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  description String?
  isActive    Boolean  @default(true)
  
  triggerType String   
  conditions  Json?    
  actionType  String   
  actionPayload Json   

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}
"""

text += "\n" + rule_model

with open('apps/server/prisma/schema.prisma', 'w') as f:
    f.write(text)
