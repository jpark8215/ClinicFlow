
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText } from "lucide-react";
import { preAuthorizations } from "@/lib/dummy-data";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PreauthCard = () => {
    const statusColors = {
        Approved: "bg-blue-100 text-blue-800",
        Pending: "bg-yellow-100 text-yellow-800",
        Denied: "bg-red-100 text-red-800",
    };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Prior Authorizations</CardTitle>
                <CardDescription>Status of recent requests</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {preAuthorizations.map((auth) => (
            <li key={auth.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{auth.patient.name}</p>
                  <p className="text-sm text-muted-foreground">{auth.service}</p>
                </div>
              </div>
              <Badge className={statusColors[auth.status]}>{auth.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PreauthCard;
