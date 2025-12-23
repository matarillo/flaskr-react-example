package com.example.flaskr;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jdbc.core.mapping.AggregateReference;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends CrudRepository<Post, Integer>, PagingAndSortingRepository<Post, Integer> {
    Page<Post> findByAuthorId(AggregateReference<User, Integer> authorId, Pageable pageable);
}
