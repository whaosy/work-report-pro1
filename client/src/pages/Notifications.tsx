import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications = [], isLoading, refetch } = trpc.notification.list.useQuery({
    unreadOnly: filter === "unread",
  });

  const markAsReadMutation = trpc.notification.markRead.useMutation();
  const markAllReadMutation = trpc.notification.markAllRead.useMutation();

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "标记失败");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success("已标记全部为已读");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">通知中心</h1>
        {notifications.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            全部已读
          </Button>
        )}
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          全部 ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
        >
          未读 ({notifications.filter(n => !n.isRead).length})
        </Button>
      </div>

      {/* 通知列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无通知</div>
        ) : (
          notifications.map((notif: any) => (
            <Card
              key={notif.id}
              className={`p-4 ${!notif.isRead ? "border-l-4 border-l-red-500 bg-red-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{notif.title}</h3>
                    {!notif.isRead && (
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-700 mt-2">{notif.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                    {notif.type && (
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                        {notif.type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="标记为已读"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}

                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
