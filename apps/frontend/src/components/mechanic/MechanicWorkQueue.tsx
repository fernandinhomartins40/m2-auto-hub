import { useState } from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import MechanicRevisionsView from "./MechanicRevisionsView";
import MechanicServiceOrdersView from "./MechanicServiceOrdersView";

interface MechanicWorkQueueProps {
  initialView?: "revisions" | "service-orders";
}

export default function MechanicWorkQueue({ initialView = "revisions" }: MechanicWorkQueueProps) {
  const [view, setView] = useState(initialView);

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as typeof view)} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 p-1">
        <TabsTrigger value="revisions" className="gap-2 py-2.5">
          <ClipboardCheck className="h-4 w-4" />
          Revisões
        </TabsTrigger>
        <TabsTrigger value="service-orders" className="gap-2 py-2.5">
          <ClipboardList className="h-4 w-4" />
          Ordens de serviço
        </TabsTrigger>
      </TabsList>
      <TabsContent value="revisions"><MechanicRevisionsView /></TabsContent>
      <TabsContent value="service-orders"><MechanicServiceOrdersView /></TabsContent>
    </Tabs>
  );
}
