if __name__ == '__main__':
    import ptap_writer.same_different_judgements.generate_same_different_task_session as gen

    frame_info_sequence = []
    gen.generate_same_different_task(
        frame_info_sequence = frame_info_sequence,
        ground_truth_is_same_sequence=ground_truth_is_same_sequence,
        give_reward_sequence=give_reward_sequence,
    )