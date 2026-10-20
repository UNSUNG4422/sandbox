"""Exact game scoring. Average winners are compared without division or rounding."""
from decimal import Decimal, InvalidOperation, localcontext


def number(value, question):
    if len(str(value)) > 64:
        raise ValueError("数値は64文字以内で入力してください。")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError("数値を入力してください。")
    if not result.is_finite() or abs(result) > Decimal('1e12'):
        raise ValueError("有限の数値（絶対値1兆以下）を入力してください。")
    if result != result.quantize(Decimal('0.01')):
        raise ValueError("小数は第2位まで入力できます。")
    if not question.get('allow_decimal') and result != result.to_integral_value():
        raise ValueError("この問題は整数で回答してください。")
    for key, sign in [('min_value', -1), ('max_value', 1)]:
        bound = question.get(key)
        if bound is not None and ((sign < 0 and result < Decimal(str(bound))) or
                                  (sign > 0 and result > Decimal(str(bound)))):
            raise ValueError("回答が指定された範囲外です。")
    return format(result, 'f')


def score(answers, settings):
    values = {p: Decimal(v) for p, v in answers.items()}
    minimum = 1 if settings.get('debug_mode', False) else 3
    if len(values) < minimum:
        return {'cancelled': True, 'target': None, 'winners': [],
                'deltas': {p: 0 for p in values}, 'reasons': {p: f'有効回答{minimum}人未満' for p in values}}
    distinct = sorted(set(values.values()))
    if settings['mode'] == 'median':
        target = distinct[len(distinct) // 2]
        winners = [p for p, v in values.items() if v == target]
    else:
        total, count = sum(values.values()), len(values)
        differences = {p: abs(v * count - total) for p, v in values.items()}
        best = min(differences.values())
        winners = [p for p, d in differences.items() if d == best]
        with localcontext() as ctx:
            ctx.prec = 40
            target = total / count
    lo, hi = min(values.values()), max(values.values())
    deltas, reasons = {}, {}
    for p, v in values.items():
        if p in winners:
            delta, reason = settings['correct_score'], '正解'
        elif lo != hi and v == lo:
            delta, reason = settings['min_penalty'], '最小値'
        elif lo != hi and v == hi:
            delta, reason = settings['max_penalty'], '最大値'
        else:
            delta, reason = 0, '回答'
        deltas[p], reasons[p] = delta, reason
    return {'cancelled': False, 'target': str(target), 'winners': winners,
            'deltas': deltas, 'reasons': reasons}
