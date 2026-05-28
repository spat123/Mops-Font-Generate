import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { LibraryAuthProvider } from '../contexts/LibraryAuthContext';
import { PlansDialog } from '../components/ui/PlansDialog';
import { EditorHomeLayout } from '../components/editor/EditorHomeLayout';
import { useEditorHomePage } from '../hooks/useEditorHomePage';

export default function Home() {
  const router = useRouter();
  const { libraryAuthValue, isPlansOpen, setIsPlansOpen, layout } = useEditorHomePage(router);

  return (
    <LibraryAuthProvider value={libraryAuthValue}>
      <PlansDialog
        open={isPlansOpen}
        onClose={() => setIsPlansOpen(false)}
        currentPlan={libraryAuthValue.isPro ? 'Pro' : 'Free'}
      />
      <EditorHomeLayout {...layout} />
    </LibraryAuthProvider>
  );
}

/** Старые ссылки `/?share=...` — серверный редирект на `/share` (OG-краулеры не выполняют JS). */
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const share = typeof query.share === 'string' ? query.share.trim() : '';
  const id = typeof query.id === 'string' ? query.id.trim() : '';
  if (id) {
    return {
      redirect: {
        destination: `/share?id=${encodeURIComponent(id)}`,
        permanent: false,
      },
    };
  }
  if (!share) return { props: {} };
  return {
    redirect: {
      destination: `/share?share=${encodeURIComponent(share)}`,
      permanent: false,
    },
  };
};
