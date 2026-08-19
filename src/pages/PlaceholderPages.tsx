import { AppShell } from '@/components/layout/AppShell';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import {
  BookOpen,
  Hammer,
  Settings,
  Info,
  type LucideIcon,
} from 'lucide-react';

interface PageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  feature?: string;
}

function PlaceholderShell({ title, description, icon, feature }: PageProps) {
  return (
    <AppShell>
      <PlaceholderPage
        title={title}
        description={description}
        icon={icon}
        feature={feature}
      />
    </AppShell>
  );
}

function KnowledgePage() {
  return (
    <PlaceholderShell
      title="知识世界"
      description="课程与知识点的结构化管理与浏览。"
      icon={BookOpen}
      feature="Course · KnowledgePoint（规划中）"
    />
  );
}

function ResourcesPage() {
  return (
    <PlaceholderShell
      title="资源工坊"
      description="练习、测评与学习资源的生产中心。"
      icon={Hammer}
      feature="Practice · Assessment（规划中）"
    />
  );
}

function SettingsPage() {
  return (
    <PlaceholderShell
      title="设置"
      description="账户、学习偏好与语言模型提供方配置。"
      icon={Settings}
    />
  );
}

function AboutPage() {
  return (
    <PlaceholderShell
      title="关于 EducationMind"
      description="「忆涟千言—教」基于学习画像、学习证据与动态学习规划的个性化 AI 学习伙伴。第一阶段仅完成教育与展示骨架。"
      icon={Info}
      feature="EducationMind · 第一阶段"
    />
  );
}

export { KnowledgePage, ResourcesPage, SettingsPage, AboutPage };
