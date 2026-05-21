// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapReSearchButton, { MOBILE_MAP_RESEARCH_TOP } from '../MapReSearchButton';
import { MOBILE_HOME_LAYOUT } from '../mobileHomeLayout';

const REM_PX = 16;
const MOBILE_VIEWPORT_HEIGHT = 667;
const MOBILE_BUTTON_HEIGHT_PX = 40;
const MOBILE_CATEGORY_RAIL_HEIGHT_PX = 36;

function remValue(value: string) {
  return Number(value.replace('rem', ''));
}

function dvhValue(value: string) {
  return Number(value.replace('dvh', ''));
}

describe('MapReSearchButton', () => {
  it('모바일 버튼은 상단 검색 진입부와 카테고리 레일 아래 위치를 사용함', () => {
    const onClick = vi.fn();

    render(<MapReSearchButton variant="mobile" onClick={onClick} />);

    const button = screen.getByTestId('mobile-map-research-button');
    expect(button).toHaveTextContent('이 지역 재검색');
    expect(button).toHaveStyle({ top: MOBILE_MAP_RESEARCH_TOP });
    expect(button).toHaveClass('md:hidden', 'max-w-[calc(100vw-2rem)]', 'whitespace-nowrap');

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('375px 지도 조작 레이어에서 카테고리 rail과 펼친 결과 시트 사이 터치 간격을 남김', () => {
    const topInsetPx = remValue(MOBILE_HOME_LAYOUT.topInset.match(/[\d.]+rem/)?.[0] || '0rem') * REM_PX;
    const railTopPx = topInsetPx + remValue(MOBILE_HOME_LAYOUT.categoryRailTopOffset) * REM_PX;
    const railBottomPx = railTopPx + MOBILE_CATEGORY_RAIL_HEIGHT_PX;
    const buttonTopPx = topInsetPx + remValue(MOBILE_HOME_LAYOUT.mapReSearchTopOffset) * REM_PX;
    const buttonBottomPx = buttonTopPx + MOBILE_BUTTON_HEIGHT_PX;
    const expandedSheetTopPx = MOBILE_VIEWPORT_HEIGHT * (1 - dvhValue(MOBILE_HOME_LAYOUT.resultSheetExpandedHeight) / 100);

    expect(buttonTopPx - railBottomPx).toBeGreaterThanOrEqual(MOBILE_HOME_LAYOUT.minRailToMapReSearchGapPx);
    expect(expandedSheetTopPx - buttonBottomPx).toBeGreaterThanOrEqual(MOBILE_HOME_LAYOUT.minMapReSearchToExpandedSheetGapPx);
  });

  it('데스크톱 버튼은 기존 상단 중앙 배치를 유지함', () => {
    render(<MapReSearchButton variant="desktop" onClick={vi.fn()} />);

    const button = screen.getByTestId('desktop-map-research-button');
    expect(button.className).toContain('top-4');
    expect(button.className).toContain('md:flex');
  });
});
