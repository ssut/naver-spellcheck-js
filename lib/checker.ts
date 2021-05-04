import axios, { AxiosRequestConfig } from 'axios';
import parse, { HTMLElement, TextNode } from 'node-html-parser';
import { URLSearchParams } from 'url';
import { SpellcheckError } from './error';
import { SpellcheckErrorType, SpellcheckResult } from './types';

interface NaverSpellCheckResponseMessageResult {
  errata_count: number;
  origin_html: string;
  html: string;
  notag_html: string;
}

interface NaverSpellCheckResponse {
  message: {
    result: NaverSpellCheckResponseMessageResult;
  };
}

const headers = {
  referer:
    'https://m.search.naver.com/search.naver?sm=mtp_hty.top&where=m&query=%EB%A7%9E%EC%B6%A4%EB%B2%95%20%EA%B2%80%EC%82%AC%EA%B8%B0',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
  accept: 'text/javascript, application/javascript, */*; q=0.01',
  dnt: '1',
  'x-requested-with': 'XMLHttpRequest',
};

export const check = async (
  text: string,
  axiosOptions?: AxiosRequestConfig,
) => {
  if (text.length > 500) {
    throw new SpellcheckError(
      `최대 500자까지 지원됩니다. (입력: ${text.length}자)`,
    );
  }

  const params = new URLSearchParams([
    ['q', text],
    ['where', 'm'],
    ['color_blindness', '1'],
    ['_', String(Date.now())],
  ]);
  const originalResponse = await axios.get<NaverSpellCheckResponse>(
    'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy',
    {
      ...axiosOptions,
      params,
      responseType: 'json',
      headers,
      validateStatus: () => true,
    },
  );
  const { status, data: response } = originalResponse;
  if (status !== 200) {
    throw new SpellcheckError(
      `올바를 응답을 얻지 못했습니다. (${status} Error)`,
    );
  }

  const {
    message: { result: data },
  } = response;
  const result: SpellcheckResult = {
    errtaCount: data.errata_count,
    text: data.notag_html,
    parts: [],
  };

  const origin = parse(data.origin_html);
  const fixed = parse(data.html);

  for (let i = 0; i < origin.childNodes.length; i++) {
    const originNode = origin.childNodes[i];
    const fixedNode = fixed.childNodes[i];

    if (fixedNode instanceof TextNode) {
      result.parts.push({
        text: fixedNode.rawText,
      });
    } else if (fixedNode instanceof HTMLElement) {
      let type = SpellcheckErrorType.Unknown;
      if (fixedNode.classList.contains('grammar')) {
        type = SpellcheckErrorType.Grammar;
      } else if (fixedNode.classList.contains('spacing')) {
        type = SpellcheckErrorType.Spacing;
      } else if (fixedNode.classList.contains('standard_spelling')) {
        type = SpellcheckErrorType.Nonstandard;
      } else if (fixedNode.classList.contains('stat')) {
        type = SpellcheckErrorType.Statistical;
      }

      result.parts.push({
        text: originNode.rawText,
        fixed: fixedNode.rawText,
        type,
      });
    }
  }

  return result;
};
