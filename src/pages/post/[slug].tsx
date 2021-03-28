/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { Comments } from '../../components/Coments';

interface Post {
  first_publication_date: string | null;
  id: string;
  uid?: string;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  prevPost: Post | undefined;
  nextPost: Post | undefined;
}

export default function Post({
  post,
  prevPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt="banner" />
        <div className={styles.post}>
          <h1>{post.data.title}</h1>
          <div className={styles.postInfo}>
            <FiCalendar color="#D7D7D7" />
            <time>
              {format(parseISO(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <FiUser color="#D7D7D7" />
            <span>{post.data.author}</span>
            <FiClock color="#D7D7D7" />
            <span>{`${readTime} min`}</span>
          </div>
          {post.data.content.map(item => (
            <div className={styles.postContent} key={item.heading}>
              <h2>{item.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(item.body),
                }}
              />
            </div>
          ))}
          <div className={styles.predictPosts}>
            <div className={`${styles.postItem} ${styles.prev}`}>
              {prevPost && (
                <>
                  <div className={styles.title}>{prevPost.data.title}</div>
                  <Link key={prevPost.uid} href={`/post/${prevPost.uid}`}>
                    <a>Post anterior</a>
                  </Link>
                </>
              )}
            </div>
            <div className={`${styles.postItem} ${styles.next}`}>
              {nextPost && (
                <>
                  <div className={styles.title}>{nextPost.data.title}</div>
                  <Link key={nextPost.uid} href={`/post/${nextPost.uid}`}>
                    <a>Próximo post</a>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Comments />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'repeatable')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 3,
    }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('repeatable', String(slug), {
    fetch: ['post.title', 'post.banner', 'post.author', 'post.content'],
  });

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'repeatable')],
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    }
  );

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'repeatable')],
    {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const post = response;

  return {
    props: {
      post,
      prevPost: prevPost.results[0] || null,
      nextPost: nextPost.results[0] || null,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
