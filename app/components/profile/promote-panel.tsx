"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Gem, Sword, User2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { ROLES, Role } from "@/lib/permissions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const roleIcons = {
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: User2,
} as const

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>


interface UserData {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
}

export function PromotePanel() {
  const t = useTranslations("profile.promote")
  const tCard = useTranslations("profile.card")
  const [searchText, setSearchText] = useState("")
  const [loading, setLoading] = useState(false)
  const [targetRole, setTargetRole] = useState<RoleWithoutEmperor>(ROLES.KNIGHT)
  const { toast } = useToast()
  
  // 用户列表状态
  const [users, setUsers] = useState<UserData[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)

  // 获取所有用户
  const fetchAllUsers = async () => {
    setLoadingUsers(true)
    setUserError(null)
    
    try {
      const res = await fetch("/api/roles/users")
      
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || "获取用户列表失败")
      }
      
      const data = await res.json() as { users?: UserData[] }
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setUserError(error instanceof Error ? error.message : "获取用户列表失败")
      toast({
        title: "获取用户列表失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setLoadingUsers(false)
    }
  }
  const roleNames = {
    [ROLES.DUKE]: tCard("roles.DUKE"),
    [ROLES.KNIGHT]: tCard("roles.KNIGHT"),
    [ROLES.CIVILIAN]: tCard("roles.CIVILIAN"),
  } as const

  const handleAction = async () => {
    if (!searchText) return

    setLoading(true)
    try {
      const res = await fetch("/api/roles/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText })
      })
      const data = await res.json() as {
        user?: {
          id: string
          name?: string
          username?: string
          email: string
          role?: string
        }
        error?: string
      }

      if (!res.ok) throw new Error(data.error || "未知错误")

      if (!data.user) {
        toast({
          title: t("noUsers"),
          description: t("searchPlaceholder"),
          variant: "destructive"
        })
        return
      }

      if (data.user.role === targetRole) {
        toast({
          title: t("updateSuccess"),
          description: t("updateSuccess"),
        })
        return
      }

      const promoteRes = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          roleName: targetRole
        })
      })

      if (!promoteRes.ok) {
        const error = await promoteRes.json() as { error: string }
        throw new Error(error.error || t("updateFailed"))
      }

      toast({
        title: t("updateSuccess"),
        description: `${data.user.username || data.user.email} - ${roleNames[targetRole]}`,
      })
      setSearchText("")
    } catch (error) {
      toast({
        title: t("updateFailed"),
        description: error instanceof Error ? error.message : t("updateFailed"),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const Icon = roleIcons[targetRole as keyof typeof roleIcons]

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">角色管理</h2>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (open) fetchAllUsers()
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              查询所有用户
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>用户列表</DialogTitle>
            </DialogHeader>
            
            <div className="mt-4 max-h-[60vh] overflow-auto">
              {loadingUsers ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : userError ? (
                <div className="text-center text-destructive py-4">
                  {userError}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  暂无用户数据
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">用户名</th>
                        <th className="px-4 py-2 text-left">邮箱</th>
                        <th className="px-4 py-2 text-left">用户账号</th>
                        <th className="px-4 py-2 text-left">角色</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-2 font-mono text-xs">{user.id}</td>
                          <td className="px-4 py-2">{user.name || '-'}</td>
                          <td className="px-4 py-2">{user.email || '-'}</td>
                          <td className="px-4 py-2">{user.username || '-'}</td>
                          <td className="px-4 py-2">{user.role ? (
                            user.role === ROLES.EMPEROR 
                              ? "皇帝" 
                              : (roleNames[user.role as 'duke' | 'knight' | 'civilian'] || user.role)
                          ) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <Select value={targetRole} onValueChange={(value) => setTargetRole(value as RoleWithoutEmperor)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.DUKE}>
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  {roleNames[ROLES.DUKE]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.KNIGHT}>
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  {roleNames[ROLES.KNIGHT]}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.CIVILIAN}>
                <div className="flex items-center gap-2">
                  <User2 className="w-4 h-4" />
                  {roleNames[ROLES.CIVILIAN]}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAction}
          disabled={loading || !searchText.trim()}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `${t("promote")} ${roleNames[targetRole]}`
          )}
        </Button>
      </div>
    </div>
  )
} 